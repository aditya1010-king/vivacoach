-- VivaCoach database schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ============================================================
-- 1. Content tables (labs, experiments, questions)
--    Readable by any signed-in user. Only you (via dashboard/SQL) can edit them.
-- ============================================================

create table public.labs (
  id          text primary key,              -- e.g. 'sppu-ce-se-dsl'
  university  text not null,                 -- e.g. 'SPPU'
  branch      text not null,                 -- e.g. 'Computer Engineering'
  semester    int  not null check (semester between 1 and 8),
  name        text not null,                 -- e.g. 'Data Structures Lab'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.experiments (
  id        text primary key,                -- e.g. 'sppu-ce-se-dsl-e1'
  lab_id    text not null references public.labs(id) on delete cascade,
  position  int  not null,
  title     text not null
);
create index on public.experiments (lab_id, position);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  text not null references public.experiments(id) on delete cascade,
  position       int  not null default 0,
  question       text not null,
  model_answer   text not null,               -- what a good 1-minute spoken answer contains
  key_points     text[] not null default '{}', -- the points an examiner listens for
  difficulty     int  not null default 2 check (difficulty between 1 and 3),
  is_active      boolean not null default true
);
create index on public.questions (experiment_id, position);

-- ============================================================
-- 2. Student data
-- ============================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  university  text,
  branch      text,
  semester    int,
  created_at  timestamptz not null default now()
);

-- Exam dates a student sets for a lab (drives the countdown)
create table public.user_labs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  lab_id     text not null references public.labs(id) on delete cascade,
  exam_date  date,
  primary key (user_id, lab_id)
);

-- Practice sessions are created ONLY by the grading function (service role),
-- so quotas cannot be bypassed from the browser.
create table public.practice_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  lab_id         text not null references public.labs(id) on delete cascade,
  experiment_id  text references public.experiments(id) on delete set null,
  question_ids   uuid[] not null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  total_score    int,
  max_score      int
);
create index on public.practice_sessions (user_id, lab_id, started_at);

-- One graded answer. Written ONLY by the grading function.
create table public.attempts (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.practice_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  answer       text not null,
  score        int  not null check (score between 0 and 10),
  feedback     jsonb not null,
  created_at   timestamptz not null default now(),
  unique (session_id, question_id)
);
create index on public.attempts (user_id, question_id, created_at desc);
create index on public.attempts (user_id, created_at);

-- Paid passes. During the validation week YOU insert these by hand after a
-- payment arrives (see README "Activating a pass"). Later, a Razorpay webhook can insert them.
create table public.passes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  lab_id         text references public.labs(id) on delete cascade, -- null = all labs
  kind           text not null check (kind in ('week', 'semester', 'annual', 'trial')),
  session_limit  int  not null,
  valid_from     timestamptz not null default now(),
  valid_until    timestamptz not null,
  amount_inr     int  not null default 0,
  payment_ref    text,
  created_at     timestamptz not null default now()
);
create index on public.passes (user_id, valid_until);

-- Students who asked to buy (lets you see demand even before payment arrives)
create table public.purchase_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  lab_id      text references public.labs(id) on delete set null,
  kind        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. Latest score per question per student (powers the weak-spot list)
-- ============================================================

create view public.latest_attempts
with (security_invoker = true) as
select distinct on (a.user_id, a.question_id)
  a.user_id, a.question_id, a.score, a.created_at, q.experiment_id, e.lab_id
from public.attempts a
join public.questions q on q.id = a.question_id
join public.experiments e on e.id = q.experiment_id
order by a.user_id, a.question_id, a.created_at desc;

-- ============================================================
-- 4. Row-level security: every student sees only their own rows
-- ============================================================

alter table public.labs              enable row level security;
alter table public.experiments       enable row level security;
alter table public.questions         enable row level security;
alter table public.profiles          enable row level security;
alter table public.user_labs         enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.attempts          enable row level security;
alter table public.passes            enable row level security;
alter table public.purchase_requests enable row level security;

-- Content: read-only for signed-in users
create policy "labs readable"        on public.labs        for select to authenticated using (is_active);
create policy "experiments readable" on public.experiments for select to authenticated using (true);
-- Questions are readable, but model answers are only returned by the grading function.
-- The app never selects model_answer directly; see column privileges below.
create policy "questions readable"   on public.questions   for select to authenticated using (is_active);

-- Hide model answers and key points from direct browser queries
revoke select on public.questions from authenticated, anon;
grant select (id, experiment_id, position, question, difficulty, is_active) on public.questions to authenticated;

-- Profiles: own row only
create policy "own profile read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Exam dates: own rows only
create policy "own user_labs" on public.user_labs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sessions, attempts, passes: read own only (writes happen in the grading function)
create policy "own sessions read" on public.practice_sessions for select to authenticated using (user_id = auth.uid());
create policy "own attempts read" on public.attempts          for select to authenticated using (user_id = auth.uid());
create policy "own passes read"   on public.passes            for select to authenticated using (user_id = auth.uid());

-- Purchase requests: students can create and read their own
create policy "own purchase requests" on public.purchase_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 5. Delete-my-data helper (called from the app's account screen)
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
