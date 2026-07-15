ALTER TABLE public.plans DROP COLUMN IF EXISTS price;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS monthly_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS yearly_price numeric NOT NULL DEFAULT 0;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month' NOT NULL;
