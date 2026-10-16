alter table public.thoughts add constraint thoughts_mood_range check (mood between 1 and 5);
alter table public.thoughts add constraint thoughts_outcome_range check (outcome_intensity is null or outcome_intensity between 0 and 100);
alter table public.breath_sessions add constraint sessions_kind_valid check (kind in ('breathing', 'grounding'));
alter table public.breath_sessions add constraint sessions_anxiety_range check ((anxiety_before is null or anxiety_before between 0 and 10) and (anxiety_after is null or anxiety_after between 0 and 10));
alter table public.breath_sessions add constraint sessions_counts_nonneg check (cycles >= 0 and duration_sec >= 0);
alter table public.push_subscriptions add constraint push_hour_range check (reminder_hour between 0 and 23);
alter table public.worries add constraint worries_status_valid check (status in ('open', 'actionable', 'let-go'));

create index if not exists thoughts_user_created_idx        on public.thoughts (user_id, created_at desc);
create index if not exists breath_sessions_user_created_idx on public.breath_sessions (user_id, created_at desc);
create index if not exists worries_user_created_idx         on public.worries (user_id, created_at desc);
create index if not exists push_subscriptions_user_idx      on public.push_subscriptions (user_id);
