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
 * Returns an array of prices so we can filter by module_key and months.
 */
async function fetchPrices(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('stripe_prices')
    .select('*')
    .eq('active', true)
    .not('module_key', 'is', null);

  if (error) {
    console.error('Failed to fetch stripe_prices from Supabase:', error.message);
    return [];
  }
  return data || [];
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
    const STRIPE_PRICES = await fetchPrices();

    // -------------------------------------------------------
    // In prepaid one-off mode, users CAN repurchase active modules
    // to extend their time. We just pass the net items to Stripe.
    // -------------------------------------------------------

    const newModules: Record<string, any> = {};

    for (const [key, value] of Object.entries(modules as Record<string, any>)) {
      if (key === 'extraBots') {
        if (typeof value === 'object' && value.quantity > 0) {
          newModules[key] = { quantity: value.quantity, months: value.months || 1 };
        }
      } else {
        if (typeof value === 'object' && value.months) {
          newModules[key] = { months: value.months };
        }
      }
    }

    // Build Line Items based on net-new module selection
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    const addItem = (key: string, months: number, quantity = 1) => {
      // Find the price for this module and duration
      // Since Stripe metadata was missing on creation, we sort by unit_amount.
      // We expect 5 tiers: 1m, 3m, 6m, 9m, 12m.
      const pricesForModule = STRIPE_PRICES
        .filter(p => p.module_key === key)
        .sort((a, b) => a.unit_amount - b.unit_amount);

      let price;

      if (pricesForModule.length === 5) {
        if (months === 1) price = pricesForModule[0];
        else if (months === 3) price = pricesForModule[1];
        else if (months === 6) price = pricesForModule[2];
        else if (months === 9) price = pricesForModule[3];
        else if (months === 12) price = pricesForModule[4];
      }

      // Fallback: try to match by metadata if they added it manually later
      if (!price) {
        price = STRIPE_PRICES.find(p => p.module_key === key && parseInt(p.metadata?.months || '0') === months);
      }
      
      if (!price) {
        console.warn(`⚠️  No Stripe Price ID found for module "${key}" with duration ${months} months.`);
        // For development, if price not found, we could abort, but to avoid breaking while prices are created:
        return false;
      }
      
      lineItems.push({ price: price.id, quantity });
      return true;
    };

    let missingPrices = false;

    if (newModules.extraBots) {
      const added = addItem('extraBots', newModules.extraBots.months, newModules.extraBots.quantity);
      if (!added) missingPrices = true;
    }

    Object.keys(newModules).forEach(key => {
      if (key !== 'extraBots') {
        const added = addItem(key, newModules[key].months, 1);
        if (!added) missingPrices = true;
      }
    });

    if (missingPrices) {
      return NextResponse.json({ error: 'Some selected pricing tiers are not configured in Stripe yet. Please contact support or try a different duration.' }, { status: 400 });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No valid modules selected.' }, { status: 400 });
    }


    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // ONE-OFF MODE
      line_items: lineItems,
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&tenantId=${tenantId}`,
      cancel_url: `${siteUrl}/store`,
      client_reference_id: `${tenantId}_modular_oneoff`,
      metadata: {
        tenantId,
        modules: JSON.stringify(newModules)
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
