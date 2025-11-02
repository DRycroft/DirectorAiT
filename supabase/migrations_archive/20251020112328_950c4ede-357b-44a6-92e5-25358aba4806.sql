-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule annual review reminders to run monthly
-- This will check for members whose profiles are over 1 year old
SELECT cron.schedule(
  'send-annual-review-reminders',
  '0 9 1 * *', -- Run at 9 AM on the 1st of each month
  $$
  SELECT
    net.http_post(
        url:='https://lomksomekpysjgtnlguq.supabase.co/functions/v1/send-annual-review',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);