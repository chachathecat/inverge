-- Owner-PC Theory only. Additive subset of the existing Review OS schema.
-- Sources: 20260422 core; 20260424 alpha; 20260426/27 study logs; 20260429 signals.
-- Never run the migration directory. Back up and restore-verify the exact local
-- database before this file. Rollback is start economics without Theory flags;
-- preserve these tables, all records and the separate permanent budget directory.
begin;
do $guard$
declare table_name text;
begin
  if current_setting('inverge.local_owner_theory', true) is distinct from 'owner_approved_one_case_20260915'
    or current_database() <> 'postgres'
    or not exists(select 1 from auth.users where email = 'owner@localhost.test') then
    raise exception 'owner_theory_local_approval_required';
  end if;
  foreach table_name in array ARRAY['profiles','study_profiles','wrong_answer_items','wrong_answer_notes','wrong_answer_tags','recurrence_features','weekly_learning_summaries','action_seeds','usage_events','review_queue_items','study_logs','learning_signal_events'] loop
    if to_regclass('public.' || table_name) is not null and
      obj_description(to_regclass('public.' || table_name), 'pg_class') is distinct from 'owner-pc-theory-additive-v1' then
      raise exception 'preserve_existing_unowned_table: %', table_name;
    end if;
  end loop;
end $guard$;


create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  invite_status text not null default 'pending',
  entitlement_tier text not null default 'free_trial',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'owner-pc-theory-additive-v1';

alter table public.profiles enable row level security;

alter table public.profiles force row level security;

revoke all on public.profiles from public, anon, authenticated;

grant select on public.profiles to authenticated;

grant select, insert, update on public.profiles to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.study_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exam_name text not null,
  exam_date date,
  preferred_subjects text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_profiles is 'owner-pc-theory-additive-v1';

alter table public.study_profiles enable row level security;

alter table public.study_profiles force row level security;

revoke all on public.study_profiles from public, anon, authenticated;

grant select on public.study_profiles to authenticated;

grant select, insert, update on public.study_profiles to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.study_profiles for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.wrong_answer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_name text not null,
  subject_label text not null,
  source_type text not null,
  source_label text,
  problem_title text,
  problem_identifier text,
  raw_question_text text,
  raw_answer_text text,
  correct_answer text not null,
  user_answer text not null,
  user_reason_text text,
  user_reason_preset text,
  confidence text not null,
  time_spent_seconds integer,
  dedupe_key text not null,
  processing_status text not null default 'completed',
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wrong_answer_items is 'owner-pc-theory-additive-v1';

alter table public.wrong_answer_items enable row level security;

alter table public.wrong_answer_items force row level security;

revoke all on public.wrong_answer_items from public, anon, authenticated;

grant select on public.wrong_answer_items to authenticated;

grant select, insert, update on public.wrong_answer_items to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.wrong_answer_items for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.wrong_answer_notes (
  id uuid primary key default gen_random_uuid(),
  wrong_answer_item_id uuid not null references public.wrong_answer_items(id) on delete cascade,
  ai_summary text not null,
  key_distinction text not null,
  review_checkpoint text not null,
  next_try_tip text not null,
  generation_source text not null,
  created_at timestamptz not null default now()
);

comment on table public.wrong_answer_notes is 'owner-pc-theory-additive-v1';

alter table public.wrong_answer_notes enable row level security;

alter table public.wrong_answer_notes force row level security;

revoke all on public.wrong_answer_notes from public, anon, authenticated;

grant select on public.wrong_answer_notes to authenticated;

grant select, insert, update on public.wrong_answer_notes to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.wrong_answer_notes for select to authenticated using (exists (select 1 from public.wrong_answer_items i where i.id = wrong_answer_notes.wrong_answer_item_id and i.user_id = (select auth.uid())));
exception when duplicate_object then null; end $policy$;

create table if not exists public.wrong_answer_tags (
  id uuid primary key default gen_random_uuid(),
  wrong_answer_item_id uuid not null references public.wrong_answer_items(id) on delete cascade,
  topic_tag text not null,
  mistake_type text not null,
  task_type text not null,
  classifier_source text not null,
  confidence numeric(5,2) not null default 0,
  recurrence_candidate boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.wrong_answer_tags is 'owner-pc-theory-additive-v1';

alter table public.wrong_answer_tags enable row level security;

alter table public.wrong_answer_tags force row level security;

revoke all on public.wrong_answer_tags from public, anon, authenticated;

grant select on public.wrong_answer_tags to authenticated;

grant select, insert, update on public.wrong_answer_tags to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.wrong_answer_tags for select to authenticated using (exists (select 1 from public.wrong_answer_items i where i.id = wrong_answer_tags.wrong_answer_item_id and i.user_id = (select auth.uid())));
exception when duplicate_object then null; end $policy$;

create table if not exists public.recurrence_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_name text not null,
  subject_label text not null,
  topic_tag text not null,
  mistake_type text not null,
  recurrence_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  risk_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, exam_name, subject_label, topic_tag, mistake_type)
);

comment on table public.recurrence_features is 'owner-pc-theory-additive-v1';

alter table public.recurrence_features enable row level security;

alter table public.recurrence_features force row level security;

revoke all on public.recurrence_features from public, anon, authenticated;

grant select on public.recurrence_features to authenticated;

grant select, insert, update on public.recurrence_features to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.recurrence_features for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.weekly_learning_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  summary_text text not null,
  top_mistake_types jsonb not null default '[]'::jsonb,
  top_topics jsonb not null default '[]'::jsonb,
  next_week_focus jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_key)
);

comment on table public.weekly_learning_summaries is 'owner-pc-theory-additive-v1';

alter table public.weekly_learning_summaries enable row level security;

alter table public.weekly_learning_summaries force row level security;

revoke all on public.weekly_learning_summaries from public, anon, authenticated;

grant select on public.weekly_learning_summaries to authenticated;

grant select, insert, update on public.weekly_learning_summaries to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.weekly_learning_summaries for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.action_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  seed_type text not null,
  priority_score numeric(8,2) not null default 0,
  rendered_text text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.action_seeds is 'owner-pc-theory-additive-v1';

alter table public.action_seeds enable row level security;

alter table public.action_seeds force row level security;

revoke all on public.action_seeds from public, anon, authenticated;

grant select on public.action_seeds to authenticated;

grant select, insert, update on public.action_seeds to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.action_seeds for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  entity_type text,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.usage_events is 'owner-pc-theory-additive-v1';

alter table public.usage_events enable row level security;

alter table public.usage_events force row level security;

revoke all on public.usage_events from public, anon, authenticated;

grant select on public.usage_events to authenticated;

grant select, insert, update on public.usage_events to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.review_queue_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  source_submission_id text,
  source_kind text not null default 'submission',
  status text not null,
  priority_score numeric(8, 2) default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.review_queue_items is 'owner-pc-theory-additive-v1';

alter table public.review_queue_items enable row level security;

alter table public.review_queue_items force row level security;

revoke all on public.review_queue_items from public, anon, authenticated;

grant select on public.review_queue_items to authenticated;

grant select, insert, update on public.review_queue_items to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.review_queue_items for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taxonomy_node_id text,
  taxonomy_candidates jsonb not null default '[]'::jsonb,
  taxonomy_classification_status text not null default 'needs_review' check (taxonomy_classification_status in ('ai_suggested','human_verified','needs_review')),
  taxonomy_classification_confidence numeric check (taxonomy_classification_confidence between 0 and 1),
  mode text not null,
  subject text not null,
  study_type text not null,
  source_label text not null,
  time_spent_minutes integer,
  not_understood text not null,
  revisit_needed text not null,
  confidence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_logs is 'owner-pc-theory-additive-v1';

alter table public.study_logs enable row level security;

alter table public.study_logs force row level security;

revoke all on public.study_logs from public, anon, authenticated;

grant select on public.study_logs to authenticated;

grant select, insert, update on public.study_logs to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.study_logs for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create table if not exists public.learning_signal_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_mode text not null check (exam_mode in ('감정평가사 1차', '감정평가사 2차')),
  subject text not null,
  source_type text not null,
  derived_tags text[] not null default '{}',
  related_formulas text[] not null default '{}',
  next_task_type text not null,
  next_task text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.learning_signal_events is 'owner-pc-theory-additive-v1';

alter table public.learning_signal_events enable row level security;

alter table public.learning_signal_events force row level security;

revoke all on public.learning_signal_events from public, anon, authenticated;

grant select on public.learning_signal_events to authenticated;

grant select, insert, update on public.learning_signal_events to service_role;

do $policy$ begin
  create policy owner_theory_read_own on public.learning_signal_events for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null; end $policy$;

create unique index if not exists idx_wrong_answer_items_user_dedupe on public.wrong_answer_items (user_id, dedupe_key);
create index if not exists idx_wrong_answer_items_user_created on public.wrong_answer_items (user_id, created_at desc);
create index if not exists idx_wrong_answer_notes_item on public.wrong_answer_notes (wrong_answer_item_id);
create index if not exists idx_wrong_answer_tags_item on public.wrong_answer_tags (wrong_answer_item_id, created_at desc);
create index if not exists idx_review_queue_items_user_created on public.review_queue_items (user_id, created_at desc);
create index if not exists idx_usage_events_user_created on public.usage_events (user_id, created_at desc);
create index if not exists learning_signal_events_user_created_idx on public.learning_signal_events (user_id, created_at desc);
notify pgrst, 'reload schema';
commit;
