-- Study log taxonomy candidate connection v1

alter table public.study_logs
  add column if not exists taxonomy_node_id text,
  add column if not exists taxonomy_candidates jsonb not null default '[]'::jsonb,
  add column if not exists taxonomy_classification_status text not null default 'needs_review',
  add column if not exists taxonomy_classification_confidence numeric;

alter table public.study_logs
  drop constraint if exists study_logs_taxonomy_classification_status_check;

alter table public.study_logs
  add constraint study_logs_taxonomy_classification_status_check
  check (taxonomy_classification_status in ('ai_suggested', 'human_verified', 'needs_review'));

alter table public.study_logs
  drop constraint if exists study_logs_taxonomy_classification_confidence_check;

alter table public.study_logs
  add constraint study_logs_taxonomy_classification_confidence_check
  check (
    taxonomy_classification_confidence is null
    or (taxonomy_classification_confidence >= 0 and taxonomy_classification_confidence <= 1)
  );
