-- Inverge service role and authenticated role grants
-- Apply this after 20260422_inverge_service_core.sql.
-- Purpose:
-- 1. service_role can read/write service tables through server-side persistence
-- 2. authenticated role has base table privileges and is still constrained by RLS

grant usage on schema public to service_role;
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to service_role, authenticated;
grant select, insert, update, delete on table public.research_participation to service_role, authenticated;
grant select, insert, update, delete on table public.exam_sessions to service_role, authenticated;
grant select, insert, update, delete on table public.answer_submissions to service_role, authenticated;
grant select, insert, update, delete on table public.rewrite_submissions to service_role, authenticated;
grant select, insert, update, delete on table public.diagnosis_results to service_role, authenticated;
grant select, insert, update, delete on table public.review_queue_items to service_role, authenticated;
grant select, insert, update, delete on table public.coaching_seeds to service_role, authenticated;
grant select, insert, update, delete on table public.problem_uploads to service_role, authenticated;
grant select, insert, update, delete on table public.derived_problem_features to service_role, authenticated;
grant select, insert, update, delete on table public.derived_answer_features to service_role, authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role, authenticated;
grant select, insert, update, delete on table public.checkout_sessions to service_role, authenticated;

grant usage, select on all sequences in schema public to service_role, authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role, authenticated;
alter default privileges in schema public grant usage, select on sequences to service_role, authenticated;
