-- Add access_pages column to users table
ALTER TABLE public.users
ADD COLUMN access_pages text[] DEFAULT ARRAY['appointments']::text[];
