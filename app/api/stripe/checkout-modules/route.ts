import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia' as any,
});

// Admin client so we can read stripe_prices without RLS auth issues
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

type PriceMap = Record<string, string>; // moduleKey -> Stripe Price ID

/**
 * Fetches real Stripe Price IDs from the `stripe_prices` Supabase table.
 * Run `node scripts/sync-stripe-prices.js` first to populate this table.
 */
async function fetchPriceMap(): Promise<PriceMap> {
  const { data, error } = await supabaseAdmin
    .from('stripe_prices')
    .select('module_key, id')
    .eq('active', true)
    .not('module_key', 'is', null);

  if (error) {
    console.error('Failed to fetch stripe_prices from Supabase:', error.message);
    return {};
  }

  const map: PriceMap = {};
  for (const row of data ?? []) {
    if (row.module_key) {
      map[row.module_key] = row.id;
    }
  }
  return map;
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

    // Fetch real Stripe Price IDs from Supabase
    const PRICES = await fetchPriceMap();

    // -------------------------------------------------------
    // SAFETY: Fetch the tenant's existing active modules so
    // we never re-charge for something they already have.
    // -------------------------------------------------------
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('modules')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    const existingModules: Record<string, any> = existingSub?.modules || {};

    // Build only the NET NEW modules — skip anything already subscribed to.
    const newModules: Record<string, any> = {};

    for (const [key, value] of Object.entries(modules as Record<string, any>)) {
      if (key === 'extraBots') {
        // Quantity module: only include if > 0 (we only ever send the additional delta)
        if (typeof value === 'number' && value > 0) {
          newModules[key] = value;
        }
      } else {
        // Boolean module: only include if newly selected AND not already active
        if (value && !existingModules[key]) {
          newModules[key] = value;
        }
      }
    }

    // Build Line Items based on net-new module selection
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    const addItem = (key: string, quantity = 1) => {
      const priceId = PRICES[key];
      if (!priceId) {
        console.warn(`⚠️  No Stripe Price ID found for module key: "${key}". Run sync-stripe-prices.js.`);
        return false;
      }
      lineItems.push({ price: priceId, quantity });
      return true;
    };

    if (newModules.extraBots > 0)           addItem('extraBots', newModules.extraBots);
    if (newModules.whatsappChannel)          addItem('whatsappChannel');
    if (newModules.telegramChannel)          addItem('telegramChannel');
    if (newModules.customEmails)             addItem('customEmails');
    if (newModules.autoFollowups)            addItem('autoFollowups');
    if (newModules.unlimitedChats)           addItem('unlimitedChats');
    if (newModules.calendarSync)             addItem('calendarSync');
    if (newModules.broadcastMessaging)       addItem('broadcastMessaging');
    if (newModules.reputationManagement)     addItem('reputationManagement');
    if (newModules.metaAds)                  addItem('metaAds');
    if (newModules.googleAds)                addItem('googleAds');
    if (newModules.telegramAds)              addItem('telegramAds');
    if (newModules.removeBranding)           addItem('removeBranding');
    if (newModules.messagingChannels)        addItem('messagingChannels');

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No new modules selected — all chosen modules are already active in your subscription.' }, { status: 400 });
    }


    // Always use the root site URL (not the subdomain origin) so /payment-success resolves correctly.
    // e.g. tenant.localhost:3000 would 404 since the route lives on root domain.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&tenantId=${tenantId}`,
      cancel_url: `${siteUrl}/store`,
      client_reference_id: `${tenantId}_modular_month`,
      subscription_data: {
        metadata: {
          tenantId
        }
      },
      metadata: {
        tenantId,
        // Only store the NET NEW modules in metadata — the webhook should only record
        // what was actually purchased in this session, not the full cart state.
        modules: JSON.stringify(newModules)
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
