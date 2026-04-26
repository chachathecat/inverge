-- Study log intake v1 for Review OS

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create index if not exists idx_study_logs_user_created
  on public.study_logs (user_id, created_at desc);

alter table public.study_logs enable row level security;

do $$ begin
  create policy "study logs own access" on public.study_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on table public.study_logs to service_role, authenticated;
