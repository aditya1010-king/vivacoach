-- Handy queries for running the validation week. Run in Supabase SQL Editor.
-- (These run as the database owner, so they see everyone's data.)

-- ============================================================
-- A. Activate a pass after a payment arrives
-- ============================================================

-- 1. Find the student by email
select id, email, created_at from auth.users where email = 'student@example.com';

-- 2a. Exam-week pass: one lab, 7 days, 20 sessions, ₹49
insert into public.passes (user_id, lab_id, kind, session_limit, valid_until, amount_inr, payment_ref)
values ('PASTE-USER-ID', 'sample-ce-3-dsl', 'week', 20, now() + interval '7 days', 49, 'UPI ref or screenshot note');

-- 2b. Semester pass: all labs, 60 sessions, ₹149 (adjust the end date to your semester end)
insert into public.passes (user_id, lab_id, kind, session_limit, valid_until, amount_inr, payment_ref)
values ('PASTE-USER-ID', null, 'semester', 60, '2027-05-31', 149, 'UPI ref');

-- Refund: end the pass now (then refund the money by UPI)
update public.passes set valid_until = now() where id = 'PASTE-PASS-ID';

-- ============================================================
-- B. Validation-week scoreboard (compare with the go/revise/stop table)
-- ============================================================

-- Signups and activation (finished at least one full session)
select
  (select count(*) from auth.users)                                              as signups,
  (select count(distinct user_id) from public.practice_sessions where completed_at is not null) as activated;

-- Repeat use: users with sessions on 2+ different days
select count(*) as returned_users from (
  select user_id from public.practice_sessions
  group by user_id having count(distinct started_at::date) >= 2
) t;

-- Hit the free limit vs asked to buy vs paid
select
  (select count(*) from (select user_id, lab_id from public.practice_sessions group by 1,2 having count(*) >= 3) t) as hit_limit,
  (select count(distinct user_id) from public.purchase_requests)                                                    as asked_to_buy,
  (select count(distinct user_id) from public.passes where amount_inr > 0)                                          as paid,
  (select coalesce(sum(amount_inr), 0) from public.passes)                                                          as revenue_inr;

-- Did scores improve? First vs latest attempt per user per question
with ranked as (
  select user_id, question_id, score,
         row_number() over (partition by user_id, question_id order by created_at)      as first_rank,
         row_number() over (partition by user_id, question_id order by created_at desc) as last_rank,
         count(*)     over (partition by user_id, question_id)                           as n
  from public.attempts
)
select round(avg(l.score - f.score), 2) as avg_improvement, count(*) as repeated_questions
from ranked f join ranked l using (user_id, question_id)
where f.first_rank = 1 and l.last_rank = 1 and f.n >= 2;

-- Hardest questions (lowest average score) - improve their model answers or teach these in your demo videos
select q.question, round(avg(a.score), 1) as avg_score, count(*) as attempts
from public.attempts a join public.questions q on q.id = a.question_id
group by q.question having count(*) >= 3
order by avg_score asc limit 10;

-- ============================================================
-- C. Grading-quality check: export 30 random answers for a senior to blind-grade
-- ============================================================
select a.id, q.question, q.model_answer, a.answer, a.score as ai_score
from public.attempts a join public.questions q on q.id = a.question_id
where length(a.answer) > 20
order by random() limit 30;
-- Download as CSV, hide the ai_score column, ask a senior/TA to score 0-10, then compare.

-- ============================================================
-- D. AI cost so far (tokens are stored with each attempt)
-- ============================================================
select
  count(*) as graded_answers,
  sum((feedback->'usage'->>'promptTokenCount')::int)     as input_tokens,
  sum((feedback->'usage'->>'candidatesTokenCount')::int) as output_tokens,
  -- Gemini 2.5 Flash-Lite list price: $0.10 per 1M input, $0.40 per 1M output; ₹88 per $ assumed
  round(( sum((feedback->'usage'->>'promptTokenCount')::int) * 0.10
        + sum((feedback->'usage'->>'candidatesTokenCount')::int) * 0.40 ) / 1e6 * 88, 2) as approx_cost_inr
from public.attempts where feedback ? 'usage';
