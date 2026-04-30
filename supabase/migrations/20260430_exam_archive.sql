create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 1900 and year <= 2200),
  round integer not null check (round >= 1 and round <= 20),
  type text not null check (type in ('first', 'second')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (year, round, type)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_no integer not null check (question_no >= 1),
  text text not null,
  choices jsonb not null default '[]'::jsonb,
  answer text,
  explanation text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (exam_id, question_no)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists exams_sort_idx on public.exams(type, year desc, round desc);
create index if not exists questions_exam_idx on public.questions(exam_id, question_no asc);
create index if not exists answers_question_idx on public.answers(question_id);

alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

drop policy if exists "exams_read_all" on public.exams;
create policy "exams_read_all" on public.exams for select using (true);

drop policy if exists "questions_read_all" on public.questions;
create policy "questions_read_all" on public.questions for select using (true);

drop policy if exists "answers_read_all" on public.answers;
create policy "answers_read_all" on public.answers for select using (true);
