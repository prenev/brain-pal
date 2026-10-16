-- Landing-page waitlist (the Wobbi site). Visitors are anonymous, so the `anon` role may ADD one row and nothing else:
-- no select, update or delete. Rows are read only in the dashboard / with the service role.
-- A repeated email is rejected by the unique constraint (23505); the website treats that as success. (`on conflict` would need
-- select access to the email column, which anon must never have.)
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  interests text[] not null default '{}',
  device text not null default 'iPhone',
  notes text,
  consent boolean not null,
  source text not null default 'landing'
);

alter table public.waitlist_signups add constraint waitlist_email_unique unique (email);
alter table public.waitlist_signups add constraint waitlist_email_lower check (email = lower(email));
alter table public.waitlist_signups add constraint waitlist_email_format check (char_length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
alter table public.waitlist_signups add constraint waitlist_name_len check (name is null or char_length(name) <= 80);
alter table public.waitlist_signups add constraint waitlist_interests_size check (cardinality(interests) <= 6 and octet_length(array_to_string(interests, '|')) <= 200);
alter table public.waitlist_signups add constraint waitlist_device_check check (device in ('iPhone', 'Android', 'Both', 'Other'));
alter table public.waitlist_signups add constraint waitlist_notes_len check (notes is null or char_length(notes) <= 500);
alter table public.waitlist_signups add constraint waitlist_consent_given check (consent);
alter table public.waitlist_signups add constraint waitlist_source_check check (source = 'landing');

alter table public.waitlist_signups enable row level security;
create policy waitlist_signups_anon_insert on public.waitlist_signups for insert to anon with check (consent and source = 'landing');
revoke all on public.waitlist_signups from anon, authenticated;
grant insert on public.waitlist_signups to anon;
