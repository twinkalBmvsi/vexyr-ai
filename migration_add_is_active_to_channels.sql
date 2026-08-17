-- Migration: Add is_active column to public.channels table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
