-- Personal Concept Graph metadata storage v1
-- Schema and RLS only: production learner write paths remain intentionally disabled.

create extension if not exists "pgcrypto";

create table if not exists public.personal_concept_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_mode text not null,
  subject_id text not null,
  unit_id text not null,
  state text not null,
  confidence text not null,
  last_result text not null,
  last_task_type text not null,
  wrong_count integer not null default 0,
  recovery_count integer not null default 0,
  stable_count integer not null default 0,
  next_recommended_task_type text not null,
  next_due_at timestamptz not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata_only boolean not null default true,
  version integer not null default 1,
  source_status text not null default 'production_schema_ready_no_write_path',
  unique (user_id, exam_mode, subject_id, unit_id),
  constraint personal_concept_nodes_exam_mode_check
    check (exam_mode in ('first', 'second')),
  constraint personal_concept_nodes_state_check
    check (state in ('unknown', 'confused', 'wrong', 'recovering', 'stable')),
  constraint personal_concept_nodes_wrong_count_check
    check (wrong_count >= 0),
  constraint personal_concept_nodes_recovery_count_check
    check (recovery_count >= 0),
  constraint personal_concept_nodes_stable_count_check
    check (stable_count >= 0),
  constraint personal_concept_nodes_metadata_only_check
    check (metadata_only is true),
  constraint personal_concept_nodes_subject_id_not_empty_check
    check (length(trim(subject_id)) > 0),
  constraint personal_concept_nodes_unit_id_not_empty_check
    check (length(trim(unit_id)) > 0),
  constraint personal_concept_nodes_next_recommended_task_type_not_empty_check
    check (length(trim(next_recommended_task_type)) > 0)
);

create index if not exists personal_concept_nodes_user_id_idx
  on public.personal_concept_nodes (user_id);

create index if not exists personal_concept_nodes_user_exam_mode_idx
  on public.personal_concept_nodes (user_id, exam_mode);

create index if not exists personal_concept_nodes_user_next_due_at_idx
  on public.personal_concept_nodes (user_id, next_due_at);

create index if not exists personal_concept_nodes_user_state_idx
  on public.personal_concept_nodes (user_id, state);

create index if not exists personal_concept_nodes_user_exam_mode_next_due_at_idx
  on public.personal_concept_nodes (user_id, exam_mode, next_due_at);

alter table public.personal_concept_nodes enable row level security;

grant select, insert, update, delete on table public.personal_concept_nodes to authenticated;

drop policy if exists "personal_concept_nodes_select_own" on public.personal_concept_nodes;
create policy "personal_concept_nodes_select_own"
  on public.personal_concept_nodes
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;
create policy "personal_concept_nodes_insert_own"
  on public.personal_concept_nodes
  as permissive
  for insert
  to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;
create policy "personal_concept_nodes_update_own"
  on public.personal_concept_nodes
  as permissive
  for update
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_concept_nodes_delete_own" on public.personal_concept_nodes;
create policy "personal_concept_nodes_delete_own"
  on public.personal_concept_nodes
  as permissive
  for delete
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());
