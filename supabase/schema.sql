-- Inverge Analysis schema
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default auth.uid(),
  email text unique,
  display_name text,
  exam_track text default '감정평가사 2차',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  answer text not null,
  transcription text not null,
  total_score int not null,
  structure_score int not null,
  content_score int not null,
  expression_score int not null,
  weaknesses text[] not null,
  next_action text not null,
  created_at timestamptz not null default now(),
  constraint evaluations_user_fk foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  avg_total_score numeric(5,2) not null default 0,
  total_evaluations int not null default 0,
  weakness_counter jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint analytics_user_fk foreign key (user_id) references public.users(id) on delete cascade
);

create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  evaluation_id uuid,
  mission_title text not null,
  mission_body text not null,
  weakness_tag text not null,
  status text not null default 'todo',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint daily_missions_user_fk foreign key (user_id) references public.users(id) on delete cascade,
  constraint daily_missions_eval_fk foreign key (evaluation_id) references public.evaluations(id) on delete set null
);

create index if not exists idx_evaluations_user_created on public.evaluations (user_id, created_at desc);
create index if not exists idx_daily_missions_user_created on public.daily_missions (user_id, created_at desc);

create or replace function public.upsert_analytics_summary(
  p_user_id uuid,
  p_weaknesses text[],
  p_total_score int
)
returns void
language plpgsql
security definer
as $$
declare
  current_row public.analytics%rowtype;
  key text;
  weakness_json jsonb;
begin
  select * into current_row from public.analytics where user_id = p_user_id;

  if not found then
    weakness_json := '{}'::jsonb;
    foreach key in array p_weaknesses loop
      weakness_json := jsonb_set(weakness_json, array[key], to_jsonb(1), true);
    end loop;

    insert into public.analytics(user_id, avg_total_score, total_evaluations, weakness_counter)
    values (p_user_id, p_total_score, 1, weakness_json);
    return;
  end if;

  weakness_json := current_row.weakness_counter;
  foreach key in array p_weaknesses loop
    weakness_json := jsonb_set(
      weakness_json,
      array[key],
      to_jsonb(coalesce((weakness_json ->> key)::int, 0) + 1),
      true
    );
  end loop;

  update public.analytics
  set
    total_evaluations = current_row.total_evaluations + 1,
    avg_total_score = ((current_row.avg_total_score * current_row.total_evaluations) + p_total_score)
      / (current_row.total_evaluations + 1),
    weakness_counter = weakness_json,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

alter table public.users enable row level security;
alter table public.evaluations enable row level security;
alter table public.analytics enable row level security;
alter table public.daily_missions enable row level security;

create policy "users can view own profile" on public.users
for select using (auth.uid() = id);

create policy "users can update own profile" on public.users
for update using (auth.uid() = id);

create policy "users can view own evaluations" on public.evaluations
for select using (auth.uid() = user_id);

create policy "users can insert own evaluations" on public.evaluations
for insert with check (auth.uid() = user_id);

create policy "users can view own analytics" on public.analytics
for select using (auth.uid() = user_id);

create policy "users can view own daily missions" on public.daily_missions
for select using (auth.uid() = user_id);

create policy "users can update own daily missions" on public.daily_missions
for update using (auth.uid() = user_id);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  round int not null,
  type text not null check (type in ('first', 'second')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject text not null,
  question_no int not null,
  question_text text,
  choices jsonb,
  explanation text,
  question_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exams_year_round_type on public.exams (year desc, round desc, type asc);
create index if not exists idx_questions_exam_subject_no on public.questions (exam_id, subject, question_no);


alter table public.answers
  add column if not exists answer_type text not null default 'model_answer',
  add column if not exists answer_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists uq_exams_year_round_type on public.exams (year, round, type);
create unique index if not exists uq_questions_exam_subject_no on public.questions (exam_id, subject, question_no);
create unique index if not exists uq_answers_question_type on public.answers (question_id, answer_type);
