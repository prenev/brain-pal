// node --experimental-strip-types scripts/test-reminder.mjs
import assert from 'node:assert/strict'
import { planNotification, streakFrom, localDay } from '../supabase/functions/_shared/reminder.ts'

const tz = 'America/New_York'
const at = iso => new Date(iso) // 2026-10-15T00:30Z == Oct 14 20:30 in New York (EDT, UTC-4)
const base = { tz, reminderHour: 20, lastSentOn: null, activityDays: new Set() }

assert.equal(localDay(at('2026-10-15T00:30:00Z'), tz), '2026-10-14')
// before the hour / after the 3h window -> nothing
assert.equal(planNotification({ ...base, now: at('2026-10-14T22:00:00Z') }), null)   // 18:00 local
assert.equal(planNotification({ ...base, now: at('2026-10-15T03:30:00Z') }), null)   // 23:30 local
// in window, no streak -> generic nudge
assert.equal(planNotification({ ...base, now: at('2026-10-15T00:30:00Z') }).title, 'How are you feeling?')
// streak at risk (active the 3 days before, not today)
const days = new Set(['2026-10-13', '2026-10-12', '2026-10-11'])
assert.match(planNotification({ ...base, activityDays: days, now: at('2026-10-15T00:30:00Z') }).title, /3-day streak/)
// already active today -> no nag
assert.equal(planNotification({ ...base, activityDays: new Set([...days, '2026-10-14']), now: at('2026-10-15T00:30:00Z') }), null)
// already sent today -> once only
assert.equal(planNotification({ ...base, lastSentOn: '2026-10-14', now: at('2026-10-15T00:30:00Z') }), null)
// missed-cron catch-up inside the window
assert.ok(planNotification({ ...base, now: at('2026-10-15T01:45:00Z') }))              // 21:45 local
assert.deepEqual(streakFrom(new Set(['2026-10-14', '2026-10-13']), '2026-10-14'), { current: 2, activeToday: true })
console.log('reminder logic: all tests passed')
