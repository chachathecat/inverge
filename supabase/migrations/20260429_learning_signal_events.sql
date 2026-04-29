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

create index if not exists learning_signal_events_user_created_idx
  on public.learning_signal_events(user_id, created_at desc);

alter table public.learning_signal_events enable row level security;

drop policy if exists "learning_signal_events_select_own" on public.learning_signal_events;
create policy "learning_signal_events_select_own"
  on public.learning_signal_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "learning_signal_events_insert_own" on public.learning_signal_events;
create policy "learning_signal_events_insert_own"
  on public.learning_signal_events
  for insert
  with check (auth.uid() = user_id);
