-- Just enough of Supabase's auth + storage + roles to test our migration on a plain Postgres.
-- roles are cluster-wide, so create them only once (several test databases share a server)
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create extension if not exists pgcrypto;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), ''), '')::uuid $$;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text, owner uuid default auth.uid(), created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language plpgsql as
  $$ declare _p text[]; begin select string_to_array(name, '/') into _p; return _p[1:array_length(_p, 1) - 1]; end $$;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select on auth.users to authenticated;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;   -- as on Supabase: RLS, not grants, hides rows
-- what Supabase does by default for tables created later in `public`
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
