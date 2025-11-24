-- Add company_name and logo_url to board_templates
ALTER TABLE board_templates 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;