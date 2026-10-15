-- Hourly trigger for the reminder sender. Run once in the Supabase SQL editor after deploying the function.
-- 1) supabase functions deploy send-reminders delete-account
-- 2) supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=<random>
--    (keys from: npx web-push generate-vapid-keys; the public key also goes in .env as VITE_VAPID_PUBLIC_KEY)
-- 3) Replace the two placeholders below, then run this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'brain-pal-reminders',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('x-cron-secret', 'SAME-VALUE-AS-CRON_SECRET', 'Content-Type', 'application/json')
     ) $$
);
