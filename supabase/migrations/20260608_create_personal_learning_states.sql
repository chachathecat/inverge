-- Personal Learning State metadata storage v1
-- Durable writes remain feature-gated and disabled by default in production.

create extension if not exists "pgcrypto";

create or replace function public.personal_learning_state_metadata_has_forbidden_key(value jsonb)
returns boolean
language sql
immutable
as $$
  with recursive walk(key, child) as (
    select null::text as key, value as child
    union all
    select entries.key, entries.value
    from walk
    cross join lateral jsonb_each(
      case when jsonb_typeof(walk.child) = 'object' then walk.child else '{}'::jsonb end
    ) as entries(key, value)
    union all
    select null::text as key, elements.value
    from walk
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(walk.child) = 'array' then walk.child else '[]'::jsonb end
    ) as elements(value)
  )
  select exists (
    select 1
    from walk
    where key is not null
      and key ~* '(raw|ocr|answer|problem|question|copyright|official|model|source|score|instructor|grader|pass|fail|text|content|body|payload)'
  );
$$;

create table if not exists public.personal_learning_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_node_id text not null,
  exam_mode text not null,
  subject text not null,
  status text not null,
  previous_status text,
  confidence_avg numeric,
  wrong_count integer not null default 0,
  correct_streak integer not null default 0,
  recovery_score numeric,
  last_seen_at timestamptz,
  next_review_at timestamptz,
  last_source_event_type text,
  last_task_type text,
  last_reason text,
  priority_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, concept_node_id),
  constraint personal_learning_states_exam_mode_check
    check (exam_mode in ('first', 'second')),
  constraint personal_learning_states_status_check
    check (status in ('unknown', 'confused', 'wrong', 'confident_wrong', 'recovering', 'stable')),
  constraint personal_learning_states_previous_status_check
    check (previous_status is null or previous_status in ('unknown', 'confused', 'wrong', 'confident_wrong', 'recovering', 'stable')),
  constraint personal_learning_states_wrong_count_check
    check (wrong_count >= 0),
  constraint personal_learning_states_correct_streak_check
    check (correct_streak >= 0),
  constraint personal_learning_states_concept_node_id_not_empty_check
    check (length(trim(concept_node_id)) > 0),
  constraint personal_learning_states_subject_not_empty_check
    check (length(trim(subject)) > 0),
  constraint personal_learning_states_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint personal_learning_states_metadata_only_check
    check (not public.personal_learning_state_metadata_has_forbidden_key(metadata))
);

create index if not exists personal_learning_states_user_id_idx
  on public.personal_learning_states (user_id);

create index if not exists personal_learning_states_user_concept_node_id_idx
  on public.personal_learning_states (user_id, concept_node_id);

create index if not exists personal_learning_states_user_status_idx
  on public.personal_learning_states (user_id, status);

create index if not exists personal_learning_states_user_next_review_at_idx
  on public.personal_learning_states (user_id, next_review_at);

alter table public.personal_learning_states enable row level security;

grant select, insert, update, delete on table public.personal_learning_states to authenticated;

drop policy if exists "personal_learning_states_select_own" on public.personal_learning_states;
create policy "personal_learning_states_select_own"
  on public.personal_learning_states
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_learning_states_insert_own" on public.personal_learning_states;
create policy "personal_learning_states_insert_own"
  on public.personal_learning_states
  as permissive
  for insert
  to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_learning_states_update_own" on public.personal_learning_states;
create policy "personal_learning_states_update_own"
  on public.personal_learning_states
  as permissive
  for update
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "personal_learning_states_delete_own" on public.personal_learning_states;
create policy "personal_learning_states_delete_own"
  on public.personal_learning_states
  as permissive
  for delete
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());
