-- ==========================================
-- Add `modules` JSONB column to subscriptions
-- This stores the active add-on modules per tenant, e.g.:
-- { "calendarSync": true, "extraBots": 2, "whatsappChannel": true }
-- ==========================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.subscriptions.modules IS
  'Active add-on modules for this subscription. Set by Stripe webhook on checkout.session.completed.';
