alter table public.thoughts           enable row level security;
alter table public.breath_sessions    enable row level security;
alter table public.worries            enable row level security;
alter table public.push_subscriptions enable row level security;

create policy thoughts_owner_all on public.thoughts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy breath_sessions_owner_all on public.breath_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy worries_owner_all on public.worries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy push_subscriptions_owner_all on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.thoughts, public.breath_sessions, public.worries, public.push_subscriptions from anon;
