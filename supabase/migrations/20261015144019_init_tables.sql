create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  situation text not null default '',
  thought text not null default '',
  emotions jsonb not null default '[]',
  internal_behaviour text not null default '',
  external_behaviour text not null default '',
  alternate_thought text not null default '',
  outcome_intensity int,
  tags text[] not null default '{}',
  photos text[] not null default '{}'
);
create table if not exists public.breath_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  pattern jsonb not null,
  cycles int not null,
  duration_sec int not null,
  completed boolean not null default true
);
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  subscription jsonb not null,
  reminder_hour int not null default 20,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);
create table if not exists public.worries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  text text not null,
  status text not null default 'open',
  action text,
  reviewed_at timestamptz
);
alter table public.thoughts add column if not exists mood int not null default 3;
alter table public.thoughts add column if not exists distortions text[] not null default '{}';
alter table public.thoughts add column if not exists audio_path text;
alter table public.thoughts add column if not exists audio_duration int;
alter table public.thoughts add column if not exists audio_mime text;
alter table public.thoughts add column if not exists transcript text;
alter table public.breath_sessions add column if not exists kind text not null default 'breathing';
alter table public.breath_sessions add column if not exists anxiety_before int;
alter table public.breath_sessions add column if not exists anxiety_after int;
alter table public.push_subscriptions add column if not exists last_sent_on text;
alter table public.thoughts alter column thought set default '';
