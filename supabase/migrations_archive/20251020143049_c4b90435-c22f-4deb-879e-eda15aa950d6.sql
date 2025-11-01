-- Update organizations table to support multiple industries and categories
ALTER TABLE public.organizations 
  ALTER COLUMN industry_sector TYPE text[] USING CASE 
    WHEN industry_sector IS NULL THEN NULL 
    ELSE ARRAY[industry_sector]::text[]
  END;

ALTER TABLE public.organizations 
  ALTER COLUMN business_category TYPE text[] USING CASE 
    WHEN business_category IS NULL THEN NULL 
    ELSE ARRAY[business_category]::text[]
  END;

COMMENT ON COLUMN public.organizations.industry_sector IS 'Multiple industry sectors the business operates in';
COMMENT ON COLUMN public.organizations.business_category IS 'Multiple business categories for government classification';