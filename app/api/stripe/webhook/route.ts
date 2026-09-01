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
    const directTenantId = (inv as any).parent?.subscription_details?.metadata?.tenantId || inv.metadata?.tenantId;
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
    } else if (session.mode === 'payment') {
      // For one-off payments, the subscription itself doesn't have a current_period_end from Stripe.
      // We rely entirely on the per-module expires_at fields.
      // But we can set the global current_period_end to something far in the future or keep it null.
      // We'll leave it as null, as modules dictate access.
    }

    // Extract purchased modules from metadata if they exist
    let purchasedModules: Record<string, any> = {};
    if (session.metadata?.modules) {
      try {
        purchasedModules = JSON.parse(session.metadata.modules);
      } catch (e) {
        console.error('Failed to parse modules from session metadata', e);
      }
    }


    // Check if subscription exists
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, modules')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const addMonthsToDate = (date: Date, months: number) => {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d;
    };

    const processModules = (existing: Record<string, any>, purchased: Record<string, any>) => {
      const merged: Record<string, any> = { ...existing };
      
      // Ensure extraBots is normalized to an array if we are modifying it
      if (purchased['extraBots'] || purchased['extendBots']) {
          const existingMod = existing['extraBots'];
          // Ensure structure exists. If legacy array exists here, we just wipe it to prevent errors, 
          // but migration script should have handled it.
          if (!existingMod || Array.isArray(existingMod) || typeof existingMod !== 'object' || (!existingMod.assigned_slots && !existingMod.unassigned_slots)) {
            merged['extraBots'] = { assigned_slots: {}, unassigned_slots: [] };
          } else {
            merged['extraBots'] = { 
              assigned_slots: existingMod.assigned_slots || {}, 
              unassigned_slots: [...(existingMod.unassigned_slots || [])] 
            };
          }
      }

      for (const [key, value] of Object.entries(purchased)) {
        if (!value || typeof value !== 'object') continue;

        const months = value.months || 1;
        const now = new Date();
        const existingMod = existing[key];
        
        if (key === 'extendBots') {
          const eb = merged['extraBots'];
          Object.entries(value).forEach(([agentId, extensionMonths]) => {
            if (agentId.startsWith('unassigned_')) {
                const idx = parseInt(agentId.split('_')[1]);
                if (eb.unassigned_slots && eb.unassigned_slots[idx]) {
                   let currentExpiresAt = now;
                   if (eb.unassigned_slots[idx].expires_at) {
                     const expDate = new Date(eb.unassigned_slots[idx].expires_at);
                     if (expDate > now) currentExpiresAt = expDate;
                   }
                   eb.unassigned_slots[idx].expires_at = addMonthsToDate(currentExpiresAt, extensionMonths as number).toISOString();
                }
            } else if (eb.assigned_slots && eb.assigned_slots[agentId]) {
               let currentExpiresAt = now;
               if (eb.assigned_slots[agentId].expires_at) {
                 const expDate = new Date(eb.assigned_slots[agentId].expires_at);
                 if (expDate > now) currentExpiresAt = expDate;
               }
               eb.assigned_slots[agentId].expires_at = addMonthsToDate(currentExpiresAt, extensionMonths as number).toISOString();
            }
          });
        } else if (key === 'extraBots') {
          const eb = merged['extraBots'];
          const newQty = value.quantity || 0;
          if (newQty > 0) {
             for (let i = 0; i < newQty; i++) {
               eb.unassigned_slots.push({
                 expires_at: addMonthsToDate(now, months).toISOString()
               });
             }
          }
        } else {
          // Standard time stacking for boolean/single-license modules
          let currentExpiresAt = now;
          
          if (existingMod) {
            if (typeof existingMod === 'boolean' || typeof existingMod === 'number') {
              currentExpiresAt = addMonthsToDate(now, 1);
            } else if (typeof existingMod === 'object' && existingMod.expires_at) {
              const expDate = new Date(existingMod.expires_at);
              if (expDate > now) {
                currentExpiresAt = expDate;
              }
            }
          }

          merged[key] = {
            expires_at: addMonthsToDate(currentExpiresAt, months).toISOString()
          };
        }
      }
      return merged;
    };

    if (existingSub) {
      const mergedModules = processModules(existingSub.modules || {}, purchasedModules);

      const updateData: any = {
        plan_id: planId,
        status: 'active',
        billing_interval: billingInterval,
        modules: Object.keys(purchasedModules).length > 0 ? mergedModules : existingSub.modules
      };

      if (customerId) updateData.stripe_customer_id = customerId;
      if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;
      if (currentPeriodEnd) updateData.current_period_end = currentPeriodEnd;

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update(updateData)
        .eq('id', existingSub.id);
        
      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
      }
    } else {
      const initialModules = processModules({}, purchasedModules);

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
          modules: initialModules
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

    // 1. Check if the invoice directly has the metadata in the newer Stripe API format or in its own metadata
    const directTenantId = (invoice as any).parent?.subscription_details?.metadata?.tenantId || invoice.metadata?.tenantId;
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
