-- Migration script to remove the plans table

-- 1. Drop foreign key constraints from tenants and subscriptions
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

-- 2. Drop the plans table
DROP TABLE IF EXISTS public.plans CASCADE;
