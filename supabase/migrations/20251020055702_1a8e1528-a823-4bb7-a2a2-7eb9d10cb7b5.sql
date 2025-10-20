-- Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;