import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client for bypassing RLS during webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia', // Latest API version (use yours if different)
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve the tenantId we passed as client_reference_id
    const tenantId = session.client_reference_id;

    if (!tenantId) {
      console.error('No client_reference_id found in session.');
      return NextResponse.json({ error: 'Missing client_reference_id' }, { status: 400 });
    }

    // Determine the plan based on the payment link
    let planId = 'starter';
    let billingInterval = 'month';
    const paymentLinkId = session.payment_link;
    
    if (paymentLinkId) {
      const id = typeof paymentLinkId === 'string' ? paymentLinkId : paymentLinkId.id;
      if (id.includes('test_4gM28t3sReon4299hZgIo07') || id.includes('test_aFa4gBgfDcgf1U1fGngIo06')) {
        planId = 'enterprise';
        if (id.includes('test_4gM28t3sReon4299hZgIo07')) billingInterval = 'year';
      } else if (id.includes('test_4gM5kF4wV2FF1U1cubgIo05') || id.includes('test_dRmcN7d3r2FFgOVcubgIo04')) {
        planId = 'growth';
        if (id.includes('test_4gM5kF4wV2FF1U1cubgIo05')) billingInterval = 'year';
      } else if (id.includes('test_5kQ6oJbZnfsr9mtbq7gIo03') || id.includes('test_14A28t9Rf3JJeGN9hZgIo02')) {
        planId = 'starter';
        if (id.includes('test_5kQ6oJbZnfsr9mtbq7gIo03')) billingInterval = 'year';
      }
    } else {
      // Fallback: guess plan based on amount_total (in cents)
      const amount = session.amount_total || 0;
      if (amount >= 20000) planId = 'enterprise';
      else if (amount >= 10000) planId = 'growth';
      else planId = 'starter';
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    // Check if subscription exists
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingSub) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          billing_interval: billingInterval,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', existingSub.id);
        
      if (error) console.error('Error updating subscription:', error);
    } else {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: planId,
          status: 'active',
          billing_interval: billingInterval,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });
        
      if (error) console.error('Error inserting subscription:', error);
    }
    
    // Also update the tenant's plan_id directly
    await supabaseAdmin
      .from('tenants')
      .update({ plan_id: planId })
      .eq('id', tenantId);

    console.log(`Successfully activated ${planId} plan for tenant ${tenantId}`);
  }

  return NextResponse.json({ received: true });
}
