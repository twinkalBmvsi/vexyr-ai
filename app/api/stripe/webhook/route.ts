import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for bypassing RLS during webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia', // Latest API version (use yours if different)
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Log the raw webhook payload to webhook_logs
  // We extract a tenantId if possible, but it might be null
  let logTenantId: string | null = null;
  
  if (event.type.startsWith('checkout.session.')) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.client_reference_id) {
      logTenantId = session.client_reference_id.split('_')[0];
    }
  } else if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata && sub.metadata.tenantId) {
      logTenantId = sub.metadata.tenantId;
    }
  } else if (event.type.startsWith('invoice.')) {
    const inv = event.data.object as Stripe.Invoice;
    const directTenantId = (inv as any).parent?.subscription_details?.metadata?.tenantId;
    if (directTenantId) {
      logTenantId = directTenantId;
    } else {
      const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id || (inv as any).parent?.subscription_details?.subscription;
      if (subId) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          if (stripeSub.metadata && stripeSub.metadata.tenantId) {
            logTenantId = stripeSub.metadata.tenantId;
          }
        } catch (e) {}
      }
    }
  }

  // Insert into webhook_logs
  await supabaseAdmin.from('webhook_logs').insert({
    tenant_id: logTenantId || null,
    event_type: event.type,
    payload: event,
    status: 'received'
  });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the client_reference_id which contains tenantId_planId_interval
    const clientRef = session.client_reference_id || '';
    const [tenantId, passedPlanId, passedInterval] = clientRef.split('_');

    if (!tenantId) {
      console.error('No client_reference_id found in session.');
      return NextResponse.json({ error: 'Missing client_reference_id' }, { status: 400 });
    }

    const planId = passedPlanId || 'starter';
    const billingInterval = passedInterval || 'month';

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    let currentPeriodEnd: string | null = null;
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // current_period_end is a Unix timestamp (seconds). Guard against null/0/NaN.
        const rawTs = (subscription as any).current_period_end;
        if (typeof rawTs === 'number' && rawTs > 0) {
          currentPeriodEnd = new Date(rawTs * 1000).toISOString();
        } else {
          console.warn('current_period_end was missing or invalid:', rawTs);
        }
      } catch (err) {
        console.error('Error fetching subscription details from Stripe:', err);
      }
    }

    // Extract purchased modules from metadata if they exist
    let purchasedModules = {};
    if (session.metadata?.modules) {
      try {
        purchasedModules = JSON.parse(session.metadata.modules);
      } catch (e) {
        console.error('Failed to parse modules from session metadata', e);
      }
    }

    // Ensure the plan row exists — 'modular' is a virtual plan for module-only purchases.
    // Without this the FK constraint on subscriptions.plan_id will reject the insert.
    await supabaseAdmin
      .from('plans')
      .upsert({
        id: planId,
        name: planId.charAt(0).toUpperCase() + planId.slice(1), // e.g. 'Modular'
        monthly_price: 0,
        yearly_price: 0,
        limits: {},
      }, { onConflict: 'id', ignoreDuplicates: true });

    // Check if subscription exists
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, modules')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingSub) {
      // Merge purchased modules with existing ones.
      // - Boolean modules: new purchase sets them to true
      // - Quantity modules (extraBots): ADD the new quantity to existing count
      const existingModules: Record<string, any> = existingSub.modules || {};
      const mergedModules: Record<string, any> = { ...existingModules };

      for (const [key, value] of Object.entries(purchasedModules as Record<string, any>)) {
        if (typeof value === 'number' && typeof existingModules[key] === 'number') {
          // Accumulate quantities (e.g. had 1 agent, bought 2 more = 3 total)
          mergedModules[key] = (existingModules[key] || 0) + value;
        } else {
          mergedModules[key] = value;
        }
      }

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: planId, // can be 'modular'
          status: 'active',
          billing_interval: billingInterval,
          current_period_end: currentPeriodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          modules: Object.keys(purchasedModules).length > 0 ? mergedModules : existingModules
        })
        .eq('id', existingSub.id);
        
      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          status: 'active',
          billing_interval: billingInterval,
          current_period_end: currentPeriodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          modules: Object.keys(purchasedModules).length > 0 ? purchasedModules : {}
        });
        
      if (error) {
        console.error('Error inserting subscription:', error);
        return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 });
      }
    }
    
    // Also update the tenant's plan_id directly
    await supabaseAdmin
      .from('tenants')
      .update({ plan_id: planId })
      .eq('id', tenantId);

    console.log(`Successfully activated ${planId} plan (and modules) for tenant ${tenantId}`);
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;
    const status = subscription.status; // 'active', 'past_due', 'canceled', 'unpaid', etc.
    
    let currentPeriodEnd: string | null = null;
    if (typeof subscription.current_period_end === 'number' && subscription.current_period_end > 0) {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    }

    // Update the local database to reflect the revoked/updated status
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: status,
        current_period_end: currentPeriodEnd,
        // If the subscription is deleted, we could clear modules, but syncing the status to 'canceled' 
        // is enough to lock the UI since the app checks for status === 'active'
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      console.error(`Error updating subscription ${subscriptionId} status to ${status}:`, error);
      return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
    }

    console.log(`Successfully updated subscription ${subscriptionId} to status: ${status}`);
  } else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    
    // Find the tenant associated with this invoice's customer
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    
    let tenantId = null;

    // 1. Check if the invoice directly has the metadata in the newer Stripe API format
    const directTenantId = (invoice as any).parent?.subscription_details?.metadata?.tenantId;
    if (directTenantId) {
      tenantId = directTenantId;
    }

    // 2. Try to find the tenant_id in our database using stripe_customer_id
    if (!tenantId && customerId) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('tenant_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (sub && sub.tenant_id) {
        tenantId = sub.tenant_id;
      }
    }

    // 3. Race condition fallback: fetch subscription from Stripe directly to check metadata
    const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || (invoice as any).parent?.subscription_details?.subscription;
    
    if (!tenantId && subId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        if (stripeSub.metadata && stripeSub.metadata.tenantId) {
          tenantId = stripeSub.metadata.tenantId;
        }
      } catch (e) {
        console.error('Fallback subscription fetch failed:', e);
      }
    }

    if (tenantId) {
      // Manual check to avoid upsert error if UNIQUE constraint is missing in remote DB
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('stripe_invoice_id', invoice.id)
        .maybeSingle();

      const invoiceData = {
        tenant_id: tenantId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due || invoice.amount_paid,
        status: invoice.status || (event.type === 'invoice.payment_failed' ? 'failed' : 'paid'),
        pdf_url: invoice.invoice_pdf || null,
      };

      if (existingInvoice) {
        const { error } = await supabaseAdmin
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingInvoice.id);
        if (error) console.error(`Error updating invoice ${invoice.id}:`, error);
        else console.log(`Successfully updated invoice ${invoice.id}`);
      } else {
        const { error } = await supabaseAdmin
          .from('invoices')
          .insert(invoiceData);
        if (error) console.error(`Error inserting invoice ${invoice.id}:`, error);
        else console.log(`Successfully inserted invoice ${invoice.id}`);
      }
    } else {
      console.warn(`Could not find tenant for invoice ${invoice.id} with customer ${customerId} even after fallback.`);
    }
  }

  return NextResponse.json({ received: true });
}
