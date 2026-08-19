import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia' as any,
});

// DUMMY PRICE IDs - Replace these with real Stripe Price IDs later
const MOCK_PRICES = {
  extraBots: 'price_mock_extra_bots',
  whatsappChannel: 'price_mock_whatsapp_channel',
  telegramChannel: 'price_mock_telegram_channel',
  customEmails: 'price_mock_custom_emails',
  autoFollowups: 'price_mock_auto_followups',
  unlimitedChats: 'price_mock_unlimited_chats',
  calendarSync: 'price_mock_calendar_sync',
  broadcastMessaging: 'price_mock_broadcast_messaging',
  reputationManagement: 'price_mock_reputation_management',
  metaAds: 'price_mock_meta_ads',
  googleAds: 'price_mock_google_ads',
  telegramAds: 'price_mock_telegram_ads',
  removeBranding: 'price_mock_remove_branding',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, modules } = await req.json();

    if (!tenantId || !modules) {
      return NextResponse.json({ error: 'Missing tenantId or modules' }, { status: 400 });
    }

    // Verify user belongs to tenant
    const { data: membership } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403 });
    }

    // Build Line Items based on module selection
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (modules.extraBots > 0) {
      lineItems.push({
        price: MOCK_PRICES.extraBots,
        quantity: modules.extraBots,
      });
    }
    if (modules.whatsappChannel) {
      lineItems.push({
        price: MOCK_PRICES.whatsappChannel,
        quantity: 1,
      });
    }
    if (modules.telegramChannel) {
      lineItems.push({
        price: MOCK_PRICES.telegramChannel,
        quantity: 1,
      });
    }
    if (modules.customEmails) {
      lineItems.push({
        price: MOCK_PRICES.customEmails,
        quantity: 1,
      });
    }
    if (modules.autoFollowups) {
      lineItems.push({
        price: MOCK_PRICES.autoFollowups,
        quantity: 1,
      });
    }
    if (modules.unlimitedChats) {
      lineItems.push({
        price: MOCK_PRICES.unlimitedChats,
        quantity: 1,
      });
    }
    if (modules.calendarSync) {
      lineItems.push({
        price: MOCK_PRICES.calendarSync,
        quantity: 1,
      });
    }
    if (modules.broadcastMessaging) {
      lineItems.push({
        price: MOCK_PRICES.broadcastMessaging,
        quantity: 1,
      });
    }
    if (modules.reputationManagement) {
      lineItems.push({
        price: MOCK_PRICES.reputationManagement,
        quantity: 1,
      });
    }
    if (modules.metaAds) {
      lineItems.push({
        price: MOCK_PRICES.metaAds,
        quantity: 1,
      });
    }
    if (modules.googleAds) {
      lineItems.push({
        price: MOCK_PRICES.googleAds,
        quantity: 1,
      });
    }
    if (modules.telegramAds) {
      lineItems.push({
        price: MOCK_PRICES.telegramAds,
        quantity: 1,
      });
    }
    if (modules.removeBranding) {
      lineItems.push({
        price: MOCK_PRICES.removeBranding,
        quantity: 1,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No modules selected' }, { status: 400 });
    }

    // Construct origin URL for success/cancel redirects
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store`,
      client_reference_id: `${tenantId}_modular_month`, // Indicates this is a modular plan checkout
      metadata: {
        tenantId,
        // We stringify the requested modules so the webhook can apply them upon success
        modules: JSON.stringify(modules)
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
