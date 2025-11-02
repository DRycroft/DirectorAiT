-- Update the cron job to include the secret header
SELECT cron.unschedule('send-annual-review-reminders');

SELECT cron.schedule(
  'send-annual-review-reminders',
  '0 9 1 * *', -- Run at 9 AM on the 1st of each month
  $$
  SELECT
    net.http_post(
        url:='https://lomksomekpysjgtnlguq.supabase.co/functions/v1/send-annual-review',
        headers:='{"Content-Type": "application/json", "x-cron-secret": "default-secret-change-me"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);