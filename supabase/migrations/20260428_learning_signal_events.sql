-- Learning signal events v1

create table if not exists public.learning_signal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_mode text not null check (exam_mode in ('first', 'second')),
  subject text not null,
  source_type text not null check (source_type in ('text', 'image', 'pdf', 'manual')),
  concept_tags text[] not null default '{}',
  formula_tags text[] not null default '{}',
  issue_tags text[] not null default '{}',
  strength_tags text[] not null default '{}',
  weakness_tags text[] not null default '{}',
  next_task jsonb not null,
  confidence numeric(4,3) not null default 0,
  source_summary text not null,
  created_at timestamptz not null default now(),
  constraint learning_signal_events_confidence_check check (confidence >= 0 and confidence <= 1)
);

create index if not exists idx_learning_signal_events_user_mode_created
  on public.learning_signal_events (user_id, exam_mode, created_at desc);

alter table public.learning_signal_events enable row level security;

do $$ begin
  create policy "learning signal events own access" on public.learning_signal_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on table public.learning_signal_events to service_role, authenticated;
