-- Brain Pal schema. Run in Supabase SQL editor (or `supabase db push`).
create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  situation text not null default '',
  thought text not null,
  emotions jsonb not null default '[]',          -- [{name, intensity 0-100}]
  internal_behaviour text not null default '',
  external_behaviour text not null default '',
  alternate_thought text not null default '',
  outcome_intensity int,                          -- re-rated emotion after alternate thought
  tags text[] not null default '{}',
  photos text[] not null default '{}'             -- storage paths in bucket "photos"
);
create index on public.thoughts (user_id, created_at desc);

create table if not exists public.breath_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  pattern jsonb not null,                         -- {inhale, hold1, exhale, hold2}
  cycles int not null,
  duration_sec int not null,
  completed boolean not null default true
);
create index on public.breath_sessions (user_id, created_at desc);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  subscription jsonb not null,
  reminder_hour int not null default 20,          -- local hour to nudge
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);

alter table public.thoughts enable row level security;
alter table public.breath_sessions enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own thoughts" on public.thoughts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on public.breath_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private photo bucket; each user may only touch files under "<uid>/".
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;
create policy "own photos read" on storage.objects for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos write" on storage.objects for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
