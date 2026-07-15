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
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      } catch (err) {
        console.error('Error fetching subscription details from Stripe:', err);
      }
    }

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
          current_period_end: currentPeriodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
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

    console.log(`Successfully activated ${planId} plan for tenant ${tenantId}`);
  }

  return NextResponse.json({ received: true });
}
