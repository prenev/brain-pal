// Runs hourly (see supabase/cron.sql). Sends a daily reminder to each push subscription at the user's
// chosen local hour, skipping anyone who already checked in today. Untested against a live project.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { localDay, planNotification } from '../_shared/reminder.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  const now = new Date()
  const since = new Date(now.getTime() - 60 * 864e5).toISOString()
  const { data: subs, error } = await admin.from('push_subscriptions').select('*')
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0, removed = 0
  for (const s of subs ?? []) {
    const [{ data: t }, { data: b }] = await Promise.all([
      admin.from('thoughts').select('created_at').eq('user_id', s.user_id).gte('created_at', since),
      admin.from('breath_sessions').select('created_at').eq('user_id', s.user_id).gte('created_at', since),
    ])
    const days = new Set([...(t ?? []), ...(b ?? [])].map(r => localDay(r.created_at, s.tz)))
    const plan = planNotification({ now, tz: s.tz, reminderHour: s.reminder_hour, lastSentOn: s.last_sent_on, activityDays: days })
    if (!plan) continue
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ ...plan, url: '/' }))
      await admin.from('push_subscriptions').update({ last_sent_on: localDay(now, s.tz) }).eq('endpoint', s.endpoint)
      sent++
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 404 || (e as { statusCode?: number }).statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint); removed++ // expired
      } else console.error('push failed', s.endpoint, e)
    }
  }
  return Response.json({ sent, removed, checked: subs?.length ?? 0 })
})
