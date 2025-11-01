-- Add comprehensive company details to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS business_number text,
ADD COLUMN IF NOT EXISTS primary_contact_name text,
ADD COLUMN IF NOT EXISTS primary_contact_role text,
ADD COLUMN IF NOT EXISTS primary_contact_email text,
ADD COLUMN IF NOT EXISTS primary_contact_phone text,
ADD COLUMN IF NOT EXISTS admin_name text,
ADD COLUMN IF NOT EXISTS admin_role text,
ADD COLUMN IF NOT EXISTS admin_email text,
ADD COLUMN IF NOT EXISTS admin_phone text,
ADD COLUMN IF NOT EXISTS reporting_frequency text CHECK (reporting_frequency IN ('monthly', 'bi-monthly', 'quarterly', 'biannually')),
ADD COLUMN IF NOT EXISTS financial_year_end date,
ADD COLUMN IF NOT EXISTS agm_date date;

-- Add phone number to profiles table for completeness
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;