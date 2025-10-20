-- Add industry and business category to organizations
ALTER TABLE public.organizations
ADD COLUMN industry_sector TEXT,
ADD COLUMN business_category TEXT,
ADD COLUMN compliance_scan_completed BOOLEAN DEFAULT false,
ADD COLUMN compliance_scan_date TIMESTAMP WITH TIME ZONE;

-- Create function to trigger compliance scan
CREATE OR REPLACE FUNCTION public.trigger_compliance_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark that a scan is needed when industry or category changes
  IF (NEW.industry_sector IS DISTINCT FROM OLD.industry_sector) OR 
     (NEW.business_category IS DISTINCT FROM OLD.business_category) THEN
    NEW.compliance_scan_completed = false;
    NEW.compliance_scan_date = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER organization_compliance_scan_trigger
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_compliance_scan();