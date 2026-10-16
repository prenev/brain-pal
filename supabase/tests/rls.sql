-- Run after stubs.sql + migrations. Raises (=> psql exits non-zero) on the first failed expectation.
drop schema if exists t cascade;
create schema t;

create function t.as_user(u uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $$;
create function t.as_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;
create function t.as_admin() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); end $$;
grant usage on schema t to anon, authenticated;

/** Runs `stmt`; passes only if it fails (optionally with a given SQLSTATE). */
create function t.fails(stmt text, state text default null, msg text default null) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if state is not null and sqlstate <> state then
      raise exception 'FAIL % : wrong error %: % (wanted %)', coalesce(msg, stmt), sqlstate, sqlerrm, state;
    end if;
    return;
  end;
  raise exception 'FAIL % : expected an error but the statement succeeded', coalesce(msg, stmt);
end $$;
create function t.eq(actual anyelement, expected anyelement, msg text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL % : got %, expected %', msg, actual, expected; end if;
end $$;

begin;
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@x.test'), ('bbbbbbbb-0000-0000-0000-000000000002', 'b@x.test');

-- ---------------------------------------------------------------- A writes own data (user_id comes from the default)
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.thoughts (thought, mood, emotions, tags) values ('A thought', 2, '[{"name":"anxious","intensity":70}]', '{work}');
insert into public.breath_sessions (pattern, cycles, duration_sec, kind, anxiety_before, anxiety_after) values ('{"inhale":4}', 6, 120, 'grounding', 8, 3);
insert into public.worries (text) values ('A worry');
insert into public.push_subscriptions (endpoint, subscription) values ('https://push.example/a', '{}');
insert into storage.objects (bucket_id, name) values ('photos', 'aaaaaaaa-0000-0000-0000-000000000001/pic.jpg');
select t.eq((select user_id from public.thoughts limit 1), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_id defaults to the signed-in user');
select t.eq((select count(*) from public.thoughts), 1::bigint, 'A sees own thought');

-- ---------------------------------------------------------------- defaults (what the app relies on)
select t.as_admin();
insert into public.thoughts (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq((select mood from public.thoughts where thought = '' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), 3, 'mood defaults to 3');
select t.eq((select emotions from public.thoughts where thought = '' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), '[]'::jsonb, 'emotions default []');
select t.eq((select distortions from public.thoughts where thought = '' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), '{}'::text[], 'distortions default {}');
select t.eq((select status from public.worries where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), 'open', 'worry status defaults to open');
select t.eq((select kind from public.breath_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), 'grounding', 'kind stored');
delete from public.thoughts where thought = '' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------- B cannot see or touch A's rows
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq((select count(*) from public.thoughts), 0::bigint, 'B sees none of A thoughts');
select t.eq((select count(*) from public.breath_sessions), 0::bigint, 'B sees none of A sessions');
select t.eq((select count(*) from public.worries), 0::bigint, 'B sees none of A worries');
select t.eq((select count(*) from public.push_subscriptions), 0::bigint, 'B sees none of A push subscriptions');
update public.thoughts set thought = 'hacked'; delete from public.thoughts; delete from public.worries;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq((select thought from public.thoughts), 'A thought', 'B update/delete did not affect A');
select t.eq((select count(*) from public.worries), 1::bigint, 'B delete did not affect A worries');

-- ---------------------------------------------------------------- B cannot write rows as A, nor steal rows by changing user_id
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails($q$insert into public.thoughts (user_id, thought) values ('aaaaaaaa-0000-0000-0000-000000000001', 'forged')$q$, '42501', 'B inserting as A');
select t.fails($q$insert into public.worries (user_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', 'forged')$q$, '42501', 'B inserting worry as A');
insert into public.thoughts (thought) values ('B thought');
select t.fails($q$update public.thoughts set user_id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$, '42501', 'B re-assigning own row to A');

-- ---------------------------------------------------------------- anonymous visitors get nothing, not even empty results
select t.as_anon();
select t.fails('select * from public.thoughts', '42501', 'anon select thoughts');
select t.fails('select * from public.worries', '42501', 'anon select worries');
select t.fails('select * from public.breath_sessions', '42501', 'anon select sessions');
select t.fails('select * from public.push_subscriptions', '42501', 'anon select push');
select t.fails($q$insert into public.thoughts (thought) values ('anon')$q$, '42501', 'anon insert');
select t.eq((select count(*) from storage.objects), 0::bigint, 'anon sees no stored files');

-- ---------------------------------------------------------------- data-integrity checks reject nonsense (23514 = check_violation)
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails($q$insert into public.thoughts (thought, mood) values ('x', 0)$q$, '23514', 'mood 0');
select t.fails($q$insert into public.thoughts (thought, mood) values ('x', 6)$q$, '23514', 'mood 6');
select t.fails($q$insert into public.thoughts (thought, outcome_intensity) values ('x', 101)$q$, '23514', 'outcome 101');
insert into public.thoughts (thought, mood, outcome_intensity) values ('edges ok', 5, 0), ('edges ok', 1, 100);
select t.fails($q$insert into public.worries (text, status) values ('x', 'bogus')$q$, '23514', 'worry status');
select t.fails($q$insert into public.breath_sessions (pattern, cycles, duration_sec, kind) values ('{}', 1, 1, 'dancing')$q$, '23514', 'session kind');
select t.fails($q$insert into public.breath_sessions (pattern, cycles, duration_sec, anxiety_before) values ('{}', 1, 1, 11)$q$, '23514', 'anxiety 11');
select t.fails($q$insert into public.breath_sessions (pattern, cycles, duration_sec) values ('{}', -1, 1)$q$, '23514', 'negative cycles');
select t.fails($q$insert into public.push_subscriptions (endpoint, subscription, reminder_hour) values ('e', '{}', 24)$q$, '23514', 'hour 24');
select t.fails($q$insert into public.thoughts (thought) values (null)$q$, '23502', 'null thought');

-- ---------------------------------------------------------------- storage: own folder only
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq((select count(*) from storage.objects), 1::bigint, 'A sees own file');
select t.fails($q$insert into storage.objects (bucket_id, name) values ('photos', 'bbbbbbbb-0000-0000-0000-000000000002/steal.jpg')$q$, '42501', 'A writing into B folder');
select t.fails($q$insert into storage.objects (bucket_id, name) values ('photos', 'loose-file.jpg')$q$, '42501', 'file outside any user folder');
select t.fails($q$insert into storage.objects (bucket_id, name) values ('other', 'aaaaaaaa-0000-0000-0000-000000000001/x.jpg')$q$, null, 'wrong bucket');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq((select count(*) from storage.objects), 0::bigint, 'B cannot see A files');
delete from storage.objects;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select t.eq((select count(*) from storage.objects), 1::bigint, 'B delete did not remove A file');
delete from storage.objects;
select t.eq((select count(*) from storage.objects), 0::bigint, 'A can delete own file');

-- bucket is private with a size cap and mime allow-list
select t.as_admin();
select t.eq((select public from storage.buckets where id = 'photos'), false, 'bucket private');
select t.eq((select file_size_limit from storage.buckets where id = 'photos'), 26214400::bigint, 'bucket size limit');
select t.eq((select 'audio/webm' = any(allowed_mime_types) and 'image/jpeg' = any(allowed_mime_types) and not 'text/html' = any(allowed_mime_types) from storage.buckets where id = 'photos'), true, 'mime allow-list');

-- ---------------------------------------------------------------- user_docs (journal / anchors / purchases … sync)
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.user_docs (kind, id, data) values ('journal', 'j1', '{"title":"A private entry"}'), ('purchase', 'p1', '{"itemId":"theme-ocean"}');
select t.eq((select user_id from public.user_docs where id = 'j1'), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_docs.user_id defaults to the signed-in user');
select t.eq((select count(*) from public.user_docs), 2::bigint, 'A sees own docs');
-- upsert (what the app does): same (user, kind, id) updates in place
insert into public.user_docs (kind, id, data, updated_at) values ('journal', 'j1', '{"title":"Edited"}', now()) on conflict (user_id, kind, id) do update set data = excluded.data, updated_at = excluded.updated_at;
select t.eq((select count(*) from public.user_docs where kind = 'journal'), 1::bigint, 'upsert does not duplicate');
select t.eq((select data->>'title' from public.user_docs where id = 'j1'), 'Edited', 'upsert updates');
-- a delete is a tombstone: deleted = true with no data
update public.user_docs set deleted = true, data = null where id = 'p1';
select t.eq((select deleted from public.user_docs where id = 'p1'), true, 'tombstone stored');
select t.fails($$update public.user_docs set deleted = true where id = 'j1'$$, '23514', 'deleted rows must carry no data');
select t.fails($$update public.user_docs set data = null where id = 'j1'$$, '23514', 'live rows must carry data');
-- validation
select t.fails($$insert into public.user_docs (kind, id, data) values ('nonsense', 'x', '{}')$$, '23514', 'unknown kind');
select t.fails($$insert into public.user_docs (kind, id, data) values ('journal', '', '{}')$$, '23514', 'empty id');
select t.fails($$insert into public.user_docs (kind, id, data) values ('journal', repeat('x', 101), '{}')$$, '23514', 'id too long');
select t.fails($$insert into public.user_docs (kind, id, data) values ('journal', 'big', jsonb_build_object('t', repeat('x', 40000)))$$, '23514', 'doc over 32 KB');
select t.fails($$insert into public.user_docs (kind, id, data, updated_at) values ('journal', 'future', '{}', now() + interval '3 days')$$, '23514', 'timestamp far in the future');
insert into public.user_docs (kind, id, data, updated_at) values ('journal', 'skew', '{}', now() + interval '1 hour');   -- small clock skew is fine
select t.eq((select count(*) from public.user_docs where id = 'skew'), 1::bigint, 'small clock skew tolerated');

select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq((select count(*) from public.user_docs), 0::bigint, 'B sees none of A''s docs');
select t.fails($$insert into public.user_docs (user_id, kind, id, data) values ('aaaaaaaa-0000-0000-0000-000000000001', 'journal', 'planted', '{}')$$, '42501', 'B cannot write into A''s docs');
with u as (update public.user_docs set data = '{"hacked":true}' where id = 'j1' returning 1) select t.eq((select count(*) from u), 0::bigint, 'B cannot update A''s doc');
with d as (delete from public.user_docs where id = 'j1' returning 1) select t.eq((select count(*) from d), 0::bigint, 'B cannot delete A''s doc');
insert into public.user_docs (kind, id, data) values ('journal', 'j1', '{"title":"B has the same id"}');   -- ids are per user, no clash
select t.eq((select count(*) from public.user_docs), 1::bigint, 'B has its own j1');

select t.as_anon();
select t.fails($$select * from public.user_docs$$, '42501', 'anon cannot read user_docs');
select t.fails($$insert into public.user_docs (user_id, kind, id, data) values ('aaaaaaaa-0000-0000-0000-000000000001', 'journal', 'anon', '{}')$$, '42501', 'anon cannot write user_docs');
select t.as_admin();
select t.eq((select data->>'title' from public.user_docs where id = 'j1' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Edited', 'A''s doc untouched by B');

-- ---------------------------------------------------------------- deleting an account removes all of its rows (delete-account relies on this)
select t.as_admin();
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.eq((select count(*) from public.thoughts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint, 'cascade thoughts');
select t.eq((select count(*) from public.breath_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint, 'cascade sessions');
select t.eq((select count(*) from public.worries where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint, 'cascade worries');
select t.eq((select count(*) from public.push_subscriptions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint, 'cascade push');
select t.eq((select count(*) from public.user_docs where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint, 'cascade user_docs');
select t.eq((select count(*) from public.user_docs where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1::bigint, 'B docs untouched');
select t.eq((select count(*) from public.thoughts where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 3::bigint, 'B rows untouched');

-- ---------------------------------------------------------------- waitlist (landing page): anon can only ADD a row
select t.as_anon();
insert into public.waitlist_signups (email, name, interests, device, notes, consent) values ('fan@x.test', 'Fan', '{Journal,Sleep}', 'Android', 'hi', true);
select t.fails($$insert into public.waitlist_signups (email, device, consent) values ('fan@x.test', 'iPhone', true)$$, '23505', 'the same email twice is a unique violation (the site treats it as success)');
select t.fails($$select * from public.waitlist_signups$$, '42501', 'anon cannot read the waitlist');
select t.fails($$update public.waitlist_signups set name = 'x'$$, '42501', 'anon cannot update the waitlist');
select t.fails($$delete from public.waitlist_signups$$, '42501', 'anon cannot delete from the waitlist');
select t.fails($$insert into public.waitlist_signups (email, consent) values ('no-consent@x.test', false)$$, null, 'consent is required');
select t.fails($$insert into public.waitlist_signups (email, consent) values ('Upper@X.test', true)$$, '23514', 'email must be lower case');
select t.fails($$insert into public.waitlist_signups (email, consent) values ('not-an-email', true)$$, '23514', 'email must look like an email');
select t.fails($$insert into public.waitlist_signups (email, consent) values ('a b@x.test', true)$$, '23514', 'no spaces in email');
select t.fails($$insert into public.waitlist_signups (email, device, consent) values ('dev@x.test', 'Palm', true)$$, '23514', 'device must be one of the options');
select t.fails($$insert into public.waitlist_signups (email, notes, consent) values ('notes@x.test', repeat('a', 501), true)$$, '23514', 'notes are capped');
select t.fails($$insert into public.waitlist_signups (email, interests, consent) values ('int@x.test', '{a,b,c,d,e,f,g}', true)$$, '23514', 'at most 6 interests');
select t.fails($$insert into public.waitlist_signups (email, source, consent) values ('src@x.test', 'other', true)$$, null, 'source is fixed');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.fails($$select * from public.waitlist_signups$$, '42501', 'signed-in users cannot read the waitlist');
select t.fails($$insert into public.waitlist_signups (email, consent) values ('user@x.test', true)$$, '42501', 'only anon (the website) adds rows');
select t.as_admin();
select t.eq((select count(*) from public.waitlist_signups), 1::bigint, 'exactly one waitlist row (duplicate and bad rows rejected)');
select t.eq((select interests from public.waitlist_signups where email = 'fan@x.test'), '{Journal,Sleep}'::text[], 'interests stored');

-- ---------------------------------------------------------------- structural guarantees
select t.eq((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0::bigint, 'RLS enabled on every public table');
select t.eq((select count(*) from pg_policies where schemaname = 'public' and (roles = '{public}' or 'anon' = any(roles)) and policyname <> 'waitlist_signups_anon_insert'), 0::bigint, 'no policy applies to public/anon (except the waitlist insert)');
select t.eq((select cmd from pg_policies where schemaname = 'public' and policyname = 'waitlist_signups_anon_insert'), 'INSERT', 'the waitlist policy is insert-only');
rollback;
select 'rls: all checks passed' as result;
