-- Add company phone and GST period to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS company_phone text,
ADD COLUMN IF NOT EXISTS gst_period text;