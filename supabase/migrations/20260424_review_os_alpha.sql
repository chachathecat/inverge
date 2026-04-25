-- Review OS alpha schema
-- Apply after 20260422_inverge_service_core.sql and 20260423_inverge_service_role_grants.sql

alter table public.profiles
  add column if not exists invite_status text not null default 'pending',
  add column if not exists entitlement_tier text not null default 'free_trial';

create table if not exists public.study_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exam_name text not null,
  exam_date date,
  preferred_subjects text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create unique index if not exists idx_wrong_answer_items_user_dedupe
  on public.wrong_answer_items (user_id, dedupe_key);
create index if not exists idx_wrong_answer_items_user_created
  on public.wrong_answer_items (user_id, created_at desc);

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

create index if not exists idx_wrong_answer_tags_item
  on public.wrong_answer_tags (wrong_answer_item_id, created_at desc);

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

create index if not exists idx_action_seeds_user_created
  on public.action_seeds (user_id, created_at desc);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  entity_type text,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_created
  on public.usage_events (user_id, created_at desc);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  page_context jsonb not null default '{}'::jsonb,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_items_user_created
  on public.feedback_items (user_id, created_at desc);

alter table public.study_profiles enable row level security;
alter table public.wrong_answer_items enable row level security;
alter table public.wrong_answer_notes enable row level security;
alter table public.wrong_answer_tags enable row level security;
alter table public.recurrence_features enable row level security;
alter table public.weekly_learning_summaries enable row level security;
alter table public.action_seeds enable row level security;
alter table public.usage_events enable row level security;
alter table public.feedback_items enable row level security;

do $$ begin
  create policy "study profiles own access" on public.study_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wrong answer items own access" on public.wrong_answer_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wrong answer notes own access" on public.wrong_answer_notes
  for select using (
    exists (
      select 1 from public.wrong_answer_items items
      where items.id = wrong_answer_item_id and items.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wrong answer tags own access" on public.wrong_answer_tags
  for select using (
    exists (
      select 1 from public.wrong_answer_items items
      where items.id = wrong_answer_item_id and items.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "recurrence features own access" on public.recurrence_features
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "weekly learning summaries own access" on public.weekly_learning_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "action seeds own access" on public.action_seeds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "usage events own access" on public.usage_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "feedback items own access" on public.feedback_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on table public.study_profiles to service_role, authenticated;
grant select, insert, update, delete on table public.wrong_answer_items to service_role, authenticated;
grant select, insert, update, delete on table public.wrong_answer_notes to service_role, authenticated;
grant select, insert, update, delete on table public.wrong_answer_tags to service_role, authenticated;
grant select, insert, update, delete on table public.recurrence_features to service_role, authenticated;
grant select, insert, update, delete on table public.weekly_learning_summaries to service_role, authenticated;
grant select, insert, update, delete on table public.action_seeds to service_role, authenticated;
grant select, insert, update, delete on table public.usage_events to service_role, authenticated;
grant select, insert, update, delete on table public.feedback_items to service_role, authenticated;
