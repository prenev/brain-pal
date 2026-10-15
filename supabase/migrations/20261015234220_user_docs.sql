-- Phase 12: one small "document" table for the wellbeing extras (journal, anchors, anchor ticks, focus sessions,
-- hand-logged sleep, purchases, ritual settings, theme). Each row is one item, owned by one user; the newest edit wins
-- (client-supplied updated_at), and deleting leaves a tombstone (deleted = true, data null) so it stays deleted everywhere.
create table if not exists public.user_docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_docs add primary key (user_id, kind, id);
alter table public.user_docs add constraint user_docs_kind_check check (kind in ('journal', 'anchor', 'anchor_check', 'focus', 'manual_night', 'purchase', 'rituals', 'theme'));
alter table public.user_docs add constraint user_docs_id_len check (char_length(id) between 1 and 100);
alter table public.user_docs add constraint user_docs_data_size check (data is null or octet_length(data::text) < 32768);
alter table public.user_docs add constraint user_docs_deleted_iff_no_data check (deleted = (data is null));
alter table public.user_docs add constraint user_docs_not_far_future check (updated_at < now() + interval '1 day');

create index if not exists user_docs_user_updated_idx on public.user_docs (user_id, updated_at);

alter table public.user_docs enable row level security;
create policy user_docs_owner_all on public.user_docs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_docs from anon;
