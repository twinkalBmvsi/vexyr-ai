-- ==========================================
-- STRIPE PRICES TABLE
-- Stores Stripe Product & Price data synced via sync script.
-- This table is global (no RLS) since it's read-only reference data.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id text PRIMARY KEY,                     -- Stripe Price ID (e.g., price_xxx)
  product_id text NOT NULL,               -- Stripe Product ID
  product_name text NOT NULL,             -- Human-readable product name (from Stripe)
  module_key text UNIQUE,                 -- Our internal key (e.g., 'extraBots', 'calendarSync')
  nickname text,                          -- Price nickname set in Stripe dashboard
  unit_amount integer,                    -- Price in cents
  currency text DEFAULT 'usd',
  recurring_interval text,               -- 'month' or 'year'
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,    -- Any extra metadata from Stripe
  synced_at timestamptz DEFAULT now()
);

-- No RLS — this is public reference data, read by all authenticated users
-- and written only by service-role (sync script / admin API)

COMMENT ON TABLE public.stripe_prices IS 'Stripe product prices synced from Stripe API. Updated via scripts/sync-stripe-prices.js';
