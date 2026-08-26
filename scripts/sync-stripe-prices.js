/**
 * scripts/sync-stripe-prices.js
 *
 * One-time (or re-runnable) script to:
 *   1. Fetch ALL active products & prices from Stripe
 *   2. Upsert them into the Supabase `stripe_prices` table
 *   3. Print a mapping table so you can verify / set module_key values
 *
 * Usage:
 *   node scripts/sync-stripe-prices.js
 *
 * Requirements:
 *   - .env.local with STRIPE_SECRET_KEY and SUPABASE_* vars
 *   - npm install stripe @supabase/supabase-js dotenv  (already in your project)
 */

// Load .env.local
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// ── Config ─────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌  Missing required environment variables. Check .env.local');
  process.exit(1);
}

// ── Module key mapping ──────────────────────────────────────────────────────
// Map your Stripe product names (or nicknames) to the internal module keys
// used in your checkout route. Edit this to match YOUR product names exactly.
//
// Key   = Stripe product name (case-insensitive, partial match)
// Value = internal module key used in MOCK_PRICES / checkout route
const MODULE_KEY_MAP = {
  'extra ai agent':           'extraBots',
  'extra bot':                'extraBots',
  'ai agent':                 'extraBots',
  'whatsapp':                 'whatsappChannel',
  'telegram channel':         'telegramChannel',
  'custom email':             'customEmails',
  'automated follow':         'autoFollowups',
  'auto follow':              'autoFollowups',
  'unlimited chat':           'unlimitedChats',
  'calendar sync':            'calendarSync',
  '3rd-party calendar':       'calendarSync',
  'broadcast':                'broadcastMessaging',
  'reputation':               'reputationManagement',
  'meta ads':                 'metaAds',
  'google ads':               'googleAds',
  'telegram ads':             'telegramAds',
  'remove branding':          'removeBranding',
  'messaging channel':        'messagingChannels',
};

function resolveModuleKey(productName, nickname) {
  const searchStr = `${productName} ${nickname || ''}`.toLowerCase();
  for (const [keyword, key] of Object.entries(MODULE_KEY_MAP)) {
    if (searchStr.includes(keyword.toLowerCase())) {
      return key;
    }
  }
  return null; // Unrecognized — will be stored without a module_key
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  console.log('🔄  Fetching products from Stripe...\n');

  // Fetch all active products
  const products = await stripe.products.list({ active: true, limit: 100 });
  const productMap = {};
  for (const p of products.data) {
    productMap[p.id] = p.name;
  }

  console.log(`✅  Found ${products.data.length} active products\n`);

  // Fetch all active prices
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

  // Filter out prices whose parent product is archived (active: false)
  // A price can still be `active: true` even if its product is archived in Stripe.
  const activePrices = prices.data.filter((price) => {
    const product = price.product;
    if (typeof product === 'object' && product !== null) {
      return product.active === true;
    }
    // If product is just an ID string (not expanded), fall back to the productMap
    // which was already filtered to active-only products
    return productMap.hasOwnProperty(product);
  });

  console.log(`✅  Found ${prices.data.length} active prices → ${activePrices.length} on active (non-archived) products\n`);

  // Build upsert rows
  const rows = activePrices.map((price) => {
    const productName = typeof price.product === 'object'
      ? price.product.name
      : (productMap[price.product] || price.product);

    const moduleKey = resolveModuleKey(productName, price.nickname || '');

    return {
      id: price.id,
      product_id: typeof price.product === 'object' ? price.product.id : price.product,
      product_name: productName,
      module_key: moduleKey,
      nickname: price.nickname || null,
      unit_amount: price.unit_amount,
      currency: price.currency,
      recurring_interval: price.recurring?.interval || null,
      active: price.active,
      metadata: { 
        ...(typeof price.product === 'object' ? price.product.metadata : {}),
        ...price.metadata 
      },
      synced_at: new Date().toISOString(),
    };
  });

  // Upsert into Supabase
  console.log('📤  Upserting prices into Supabase stripe_prices table...\n');

  const { error } = await supabase
    .from('stripe_prices')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('❌  Supabase upsert failed:', error.message);
    process.exit(1);
  }

  // Clean up archived/removed prices from Supabase
  console.log('🧹  Cleaning up archived prices from database...\n');
  const activePriceIds = rows.map(r => r.id);
  if (activePriceIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('stripe_prices')
      .delete()
      .not('id', 'in', `(${activePriceIds.join(',')})`);
      
    if (deleteError) {
      console.error('❌  Failed to clean up archived prices:', deleteError.message);
    }
  }

  console.log('✅  Sync complete!\n');

  // Pretty-print mapping table
  console.log('─'.repeat(100));
  console.log(
    'Product Name'.padEnd(35),
    'Price ID'.padEnd(30),
    'Module Key'.padEnd(25),
    'Amount'.padEnd(10),
    'Interval'
  );
  console.log('─'.repeat(100));

  for (const row of rows) {
    const amount = row.unit_amount != null ? `$${(row.unit_amount / 100).toFixed(2)}` : 'N/A';
    console.log(
      row.product_name.substring(0, 33).padEnd(35),
      row.id.padEnd(30),
      (row.module_key || '⚠️  UNMAPPED').padEnd(25),
      amount.padEnd(10),
      row.recurring_interval || 'one-time'
    );
  }

  console.log('─'.repeat(100));
  console.log('\n💡  Any rows with ⚠️  UNMAPPED need a module_key.');
  console.log('   Add them to MODULE_KEY_MAP in this script, or set them manually in Supabase.\n');
  console.log('   After verifying, your checkout route will automatically use these real Price IDs.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
