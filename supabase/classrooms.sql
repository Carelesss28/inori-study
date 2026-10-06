-- Inori Study — classrooms (channel-style feed per class)
--
-- HOW TO RUN: Supabase dashboard → your "Inori Study" project → SQL Editor → New query →
-- paste this whole file → Run. Run it once, on an empty project.
--
-- Teachers post announcements + question sets; students read and answer.
-- Access model (deliberately light, no passwords): every device gets a random secret when the
-- person enters their name. Tables are closed to the public API (RLS on, no policies, no grants);
-- the app can only call the SECURITY DEFINER functions below, and each one checks that secret,
-- that teachers act only on their own classes, and that students only see published sets in
-- classes they've joined.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  secret uuid not null default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  owner_id uuid not null references public.people(id) on delete cascade,
  join_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.members (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (classroom_id, person_id)
);

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  kind text not null check (kind in ('announcement', 'set')),
  body text not null default '' check (char_length(body) <= 4000),
  set_id uuid unique references public.question_sets(id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'set') = (set_id is not null))
);

create table public.set_attempts (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.question_sets(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  score int not null check (score between 0 and 100),
  started_at timestamptz not null,
  finished_at timestamptz not null default now()
);

create index on public.classrooms (owner_id);
create index on public.members (person_id);
create index on public.question_sets (classroom_id);
create index on public.posts (classroom_id, created_at);
create index on public.set_attempts (set_id);
create index on public.set_attempts (person_id);

alter table public.people enable row level security;
alter table public.classrooms enable row level security;
alter table public.members enable row level security;
alter table public.question_sets enable row level security;
alter table public.posts enable row level security;
alter table public.set_attempts enable row level security;
revoke all on public.people, public.classrooms, public.members, public.question_sets, public.posts, public.set_attempts from anon, authenticated;

-- ---------------------------------------------------------------- helpers

create function private.whoami(p_person uuid, p_secret uuid) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from people where id = p_person and secret = p_secret) then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  return p_person;
end $$;

create function private.require_teacher(p_person uuid, p_classroom uuid) returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from classrooms where id = p_classroom and owner_id = p_person) then
    raise exception 'not_teacher' using errcode = '42501';
  end if;
end $$;

create function private.new_code() returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from classrooms where code = c);
  end loop;
  return c;
end $$;

-- a set gets exactly one feed post, created the first time it is published
create function private.ensure_set_post(p_set uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  insert into posts (classroom_id, kind, set_id)
  select s.classroom_id, 'set', s.id from question_sets s where s.id = p_set and s.published
  on conflict (set_id) do nothing;
end $$;

-- ---------------------------------------------------------------- identity

create function public.register_person(p_name text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r people;
begin
  insert into people (name) values (btrim(p_name)) returning * into r;
  return json_build_object('id', r.id, 'secret', r.secret, 'name', r.name);
end $$;

create function public.whoami(p_person uuid, p_secret uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  return (select json_build_object('id', id, 'name', name) from people where id = p_person);
end $$;

create function public.rename_person(p_person uuid, p_secret uuid, p_name text) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  update people set name = btrim(p_name) where id = p_person;
  update members set display_name = btrim(p_name) where person_id = p_person;
end $$;

-- ---------------------------------------------------------------- classrooms

create function public.create_classroom(p_person uuid, p_secret uuid, p_name text, p_description text) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare new_id uuid;
begin
  perform private.whoami(p_person, p_secret);
  insert into classrooms (code, name, description, owner_id)
  values (private.new_code(), btrim(p_name), coalesce(btrim(p_description), ''), p_person)
  returning id into new_id;
  return new_id;
end $$;

create function public.update_classroom(p_person uuid, p_secret uuid, p_classroom uuid, p_name text, p_description text, p_join_open boolean) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  update classrooms set name = btrim(p_name), description = coalesce(btrim(p_description), ''), join_open = p_join_open
   where id = p_classroom;
end $$;

create function public.regenerate_code(p_person uuid, p_secret uuid, p_classroom uuid) returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare c text;
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  c := private.new_code();
  update classrooms set code = c where id = p_classroom;
  return c;
end $$;

create function public.delete_classroom(p_person uuid, p_secret uuid, p_classroom uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  delete from classrooms where id = p_classroom;
end $$;

create function public.join_classroom(p_person uuid, p_secret uuid, p_code text, p_display_name text) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare c classrooms;
begin
  perform private.whoami(p_person, p_secret);
  select * into c from classrooms where code = upper(btrim(p_code));
  if not found then raise exception 'class_not_found' using errcode = 'P0002'; end if;
  if c.owner_id = p_person then raise exception 'own_class' using errcode = '22023'; end if;
  if not c.join_open and not exists (select 1 from members where classroom_id = c.id and person_id = p_person) then
    raise exception 'class_closed' using errcode = '42501';
  end if;
  insert into members (classroom_id, person_id, display_name) values (c.id, p_person, btrim(p_display_name))
  on conflict (classroom_id, person_id) do update set display_name = excluded.display_name;
  return c.id;
end $$;

create function public.leave_classroom(p_person uuid, p_secret uuid, p_classroom uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  delete from members where classroom_id = p_classroom and person_id = p_person;
end $$;

create function public.remove_member(p_person uuid, p_secret uuid, p_classroom uuid, p_member uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  delete from members where classroom_id = p_classroom and person_id = p_member;
  delete from set_attempts a using question_sets s
   where a.set_id = s.id and s.classroom_id = p_classroom and a.person_id = p_member;
end $$;

-- chat-list style overview: every class I teach or have joined, with the latest visible post
create function public.my_classrooms(p_person uuid, p_secret uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform private.whoami(p_person, p_secret);
  return coalesce((
    select json_agg(x order by coalesce(x.last_post_at, x.created_at) desc) from (
      select c.id, c.name, c.description, c.code, c.join_open, c.created_at, r.role,
             (select name from people where id = c.owner_id) as teacher_name,
             (select count(*) from members m where m.classroom_id = c.id) as member_count,
             (select count(*) from question_sets s where s.classroom_id = c.id and (r.role = 'teacher' or s.published)) as set_count,
             (select count(distinct a.set_id) from set_attempts a join question_sets s on s.id = a.set_id
               where s.classroom_id = c.id and s.published and a.person_id = p_person) as done_count,
             lp.created_at as last_post_at,
             case when lp.kind = 'set' then '🧩 ' || (select title from question_sets where id = lp.set_id) else lp.body end as last_post
        from classrooms c
        cross join lateral (
          select case when c.owner_id = p_person then 'teacher' else 'student' end as role
        ) r
        left join lateral (
          select p.* from posts p
            left join question_sets s on s.id = p.set_id
           where p.classroom_id = c.id and (p.kind = 'announcement' or s.published)
           order by p.created_at desc limit 1
        ) lp on true
       where c.owner_id = p_person
          or exists (select 1 from members m where m.classroom_id = c.id and m.person_id = p_person)
    ) x
  ), '[]'::json);
end $$;

create function public.classroom_detail(p_person uuid, p_secret uuid, p_classroom uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c classrooms; is_teacher boolean;
begin
  perform private.whoami(p_person, p_secret);
  select * into c from classrooms where id = p_classroom;
  if not found then raise exception 'class_not_found' using errcode = 'P0002'; end if;
  is_teacher := c.owner_id = p_person;
  if not is_teacher and not exists (select 1 from members where classroom_id = c.id and person_id = p_person) then
    raise exception 'not_member' using errcode = '42501';
  end if;

  return json_build_object(
    'role', case when is_teacher then 'teacher' else 'student' end,
    'classroom', json_build_object(
      'id', c.id, 'name', c.name, 'description', c.description,
      'code', case when is_teacher then c.code end,
      'join_open', c.join_open, 'created_at', c.created_at,
      'teacher_name', (select name from people where id = c.owner_id)),
    'member_count', (select count(*) from members where classroom_id = c.id),
    'members', case when is_teacher then coalesce((
        select json_agg(json_build_object('person_id', m.person_id, 'display_name', m.display_name, 'joined_at', m.joined_at)
                        order by lower(m.display_name))
          from members m where m.classroom_id = c.id), '[]'::json) else '[]'::json end,
    'posts', coalesce((
        select json_agg(json_build_object('id', p.id, 'kind', p.kind, 'body', p.body, 'set_id', p.set_id,
                                          'pinned', p.pinned, 'created_at', p.created_at) order by p.created_at)
          from posts p left join question_sets s on s.id = p.set_id
         where p.classroom_id = c.id and (p.kind = 'announcement' or is_teacher or s.published)), '[]'::json),
    'sets', coalesce((
        select json_agg(json_build_object('id', s.id, 'title', s.title, 'description', s.description, 'questions', s.questions,
                                          'published', s.published, 'created_at', s.created_at, 'updated_at', s.updated_at)
                        order by s.created_at)
          from question_sets s where s.classroom_id = c.id and (is_teacher or s.published)), '[]'::json),
    'attempts', coalesce((
        select json_agg(json_build_object('id', a.id, 'set_id', a.set_id, 'person_id', a.person_id, 'answers', a.answers,
                                          'results', a.results, 'score', a.score, 'started_at', a.started_at, 'finished_at', a.finished_at)
                        order by a.finished_at)
          from set_attempts a join question_sets s on s.id = a.set_id
         where s.classroom_id = c.id and (is_teacher or a.person_id = p_person)), '[]'::json),
    -- students see how many classmates finished each set (no names, no scores)
    'set_progress', coalesce((
        select json_object_agg(s.id, (select count(distinct a.person_id) from set_attempts a where a.set_id = s.id))
          from question_sets s where s.classroom_id = c.id and (is_teacher or s.published)), '{}'::json)
  );
end $$;

-- ---------------------------------------------------------------- feed posts

create function public.post_announcement(p_person uuid, p_secret uuid, p_classroom uuid, p_body text) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare pid uuid;
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  if char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'empty_post' using errcode = '22023'; end if;
  insert into posts (classroom_id, kind, body) values (p_classroom, 'announcement', btrim(p_body)) returning id into pid;
  return pid;
end $$;

create function public.pin_post(p_person uuid, p_secret uuid, p_post uuid, p_pinned boolean) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare cid uuid;
begin
  perform private.whoami(p_person, p_secret);
  select classroom_id into cid from posts where id = p_post;
  if cid is null then raise exception 'post_not_found' using errcode = 'P0002'; end if;
  perform private.require_teacher(p_person, cid);
  update posts set pinned = p_pinned where id = p_post;
end $$;

-- deleting a set's post also deletes the set (and its attempts)
create function public.delete_post(p_person uuid, p_secret uuid, p_post uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare p posts;
begin
  perform private.whoami(p_person, p_secret);
  select * into p from posts where id = p_post;
  if not found then return; end if;
  perform private.require_teacher(p_person, p.classroom_id);
  if p.kind = 'set' then delete from question_sets where id = p.set_id;
  else delete from posts where id = p_post; end if;
end $$;

-- ---------------------------------------------------------------- question sets

create function public.save_set(p_person uuid, p_secret uuid, p_classroom uuid, p_set uuid, p_title text, p_description text, p_questions jsonb, p_published boolean) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare sid uuid;
begin
  perform private.whoami(p_person, p_secret);
  perform private.require_teacher(p_person, p_classroom);
  if p_set is null then
    insert into question_sets (classroom_id, title, description, questions, published)
    values (p_classroom, btrim(p_title), coalesce(btrim(p_description), ''), p_questions, p_published)
    returning id into sid;
  else
    update question_sets
       set title = btrim(p_title), description = coalesce(btrim(p_description), ''), questions = p_questions,
           published = p_published, updated_at = now()
     where id = p_set and classroom_id = p_classroom
    returning id into sid;
    if sid is null then raise exception 'set_not_found' using errcode = 'P0002'; end if;
  end if;
  perform private.ensure_set_post(sid);
  return sid;
end $$;

create function public.delete_set(p_person uuid, p_secret uuid, p_set uuid) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare cid uuid;
begin
  perform private.whoami(p_person, p_secret);
  select classroom_id into cid from question_sets where id = p_set;
  if cid is null then return; end if;
  perform private.require_teacher(p_person, cid);
  delete from question_sets where id = p_set;
end $$;

create function public.set_published(p_person uuid, p_secret uuid, p_set uuid, p_published boolean) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare cid uuid;
begin
  perform private.whoami(p_person, p_secret);
  select classroom_id into cid from question_sets where id = p_set;
  if cid is null then raise exception 'set_not_found' using errcode = 'P0002'; end if;
  perform private.require_teacher(p_person, cid);
  update question_sets set published = p_published, updated_at = now() where id = p_set;
  perform private.ensure_set_post(p_set);
end $$;

create function public.submit_set_attempt(p_person uuid, p_secret uuid, p_set uuid, p_answers jsonb, p_results jsonb, p_score int, p_started_at timestamptz) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare s question_sets; aid uuid;
begin
  perform private.whoami(p_person, p_secret);
  select * into s from question_sets where id = p_set;
  if not found or not s.published then raise exception 'set_not_available' using errcode = 'P0002'; end if;
  if not exists (select 1 from members where classroom_id = s.classroom_id and person_id = p_person) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  insert into set_attempts (set_id, person_id, answers, results, score, started_at)
  values (p_set, p_person, coalesce(p_answers, '{}'::jsonb), coalesce(p_results, '[]'::jsonb),
          greatest(0, least(100, p_score)), least(coalesce(p_started_at, now()), now()))
  returning id into aid;
  return aid;
end $$;

-- ---------------------------------------------------------------- grants

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  public.register_person(text),
  public.whoami(uuid, uuid),
  public.rename_person(uuid, uuid, text),
  public.create_classroom(uuid, uuid, text, text),
  public.update_classroom(uuid, uuid, uuid, text, text, boolean),
  public.regenerate_code(uuid, uuid, uuid),
  public.delete_classroom(uuid, uuid, uuid),
  public.join_classroom(uuid, uuid, text, text),
  public.leave_classroom(uuid, uuid, uuid),
  public.remove_member(uuid, uuid, uuid, uuid),
  public.my_classrooms(uuid, uuid),
  public.classroom_detail(uuid, uuid, uuid),
  public.post_announcement(uuid, uuid, uuid, text),
  public.pin_post(uuid, uuid, uuid, boolean),
  public.delete_post(uuid, uuid, uuid),
  public.save_set(uuid, uuid, uuid, uuid, text, text, jsonb, boolean),
  public.delete_set(uuid, uuid, uuid),
  public.set_published(uuid, uuid, uuid, boolean),
  public.submit_set_attempt(uuid, uuid, uuid, jsonb, jsonb, int, timestamptz)
to anon, authenticated;
