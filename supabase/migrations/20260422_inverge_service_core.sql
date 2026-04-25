-- Inverge service core schema
-- Apply this on a clean or freshly linked Supabase project first.
-- This migration creates policies with fixed names, so re-running it on an
-- already-applied project can fail unless those policies are removed first.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_participation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  raw_answer_storage_opt_in boolean not null default false,
  derived_feature_research_opt_in boolean not null default false,
  model_improvement_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  session_kind text not null,
  source_label text,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answer_submissions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  session_id text,
  submission_kind text not null,
  source_label text,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewrite_submissions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  source_submission_id text,
  rewrite_kind text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnosis_results (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  source_submission_id text,
  source_rewrite_id text,
  result_kind text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.coaching_seeds (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  stage text not null,
  seed_kind text not null,
  source_submission_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problem_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.derived_problem_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_upload_id uuid references public.problem_uploads(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.derived_answer_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_submission_id text references public.answer_submissions(id) on delete cascade,
  exam_id text not null,
  subject_id text,
  derived_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.answer_submissions
  alter column session_id type text using session_id::text;

alter table public.problem_uploads
  add column if not exists updated_at timestamptz not null default now();

alter table public.derived_problem_features
  add column if not exists updated_at timestamptz not null default now();

alter table public.derived_answer_features
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null,
  status text not null,
  provider text not null,
  current_period_ends_at timestamptz,
  checkout_session_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_sessions (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  interval text not null,
  provider text not null,
  checkout_url text not null,
  return_path text not null,
  status text not null,
  failure_reason text,
  mock boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_sessions_user_exam on public.exam_sessions (user_id, exam_id, created_at desc);
create index if not exists idx_answer_submissions_user_exam on public.answer_submissions (user_id, exam_id, created_at desc);
create index if not exists idx_rewrite_submissions_user_exam on public.rewrite_submissions (user_id, exam_id, created_at desc);
create index if not exists idx_diagnosis_results_user_exam on public.diagnosis_results (user_id, exam_id, created_at desc);
create index if not exists idx_review_queue_items_user_exam on public.review_queue_items (user_id, exam_id, created_at desc);
create index if not exists idx_coaching_seeds_user_exam on public.coaching_seeds (user_id, exam_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.research_participation enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.answer_submissions enable row level security;
alter table public.rewrite_submissions enable row level security;
alter table public.diagnosis_results enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.coaching_seeds enable row level security;
alter table public.problem_uploads enable row level security;
alter table public.derived_problem_features enable row level security;
alter table public.derived_answer_features enable row level security;
alter table public.subscriptions enable row level security;
alter table public.checkout_sessions enable row level security;

create policy "profiles own access" on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "research participation own access" on public.research_participation
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exam sessions own access" on public.exam_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "answer submissions own access" on public.answer_submissions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rewrite submissions own access" on public.rewrite_submissions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "diagnosis results own access" on public.diagnosis_results
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "review queue own access" on public.review_queue_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "coaching seeds own access" on public.coaching_seeds
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "problem uploads own access" on public.problem_uploads
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "derived problem features own access" on public.derived_problem_features
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "derived answer features own access" on public.derived_answer_features
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions own access" on public.subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "checkout sessions own access" on public.checkout_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
