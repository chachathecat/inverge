-- Legal grounding source corpus v1
-- Official law source anchors only. Client writes are intentionally disabled.

create extension if not exists "pgcrypto";
create extension if not exists vector;

create table if not exists public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  source_type text not null,
  provider text not null,
  provider_law_id text,
  priority integer not null default 0,
  exam_subjects text[] not null default '{}'::text[],
  needs_official_verification boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_sources_source_key_not_empty_check
    check (length(trim(source_key)) > 0),
  constraint legal_sources_title_not_empty_check
    check (length(trim(title)) > 0),
  constraint legal_sources_source_type_check
    check (source_type in ('current_law')),
  constraint legal_sources_provider_check
    check (provider = 'moleg_law_open_api'),
  constraint legal_sources_priority_check
    check (priority >= 0)
);

create table if not exists public.legal_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.legal_sources(id) on delete cascade,
  provider_law_id text not null,
  law_title text not null,
  promulgation_date date,
  effective_date date,
  promulgation_number text,
  ministry_name text,
  version_hash text not null,
  raw_xml_sha256 text not null,
  fetched_at timestamptz not null default now(),
  is_current boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  constraint legal_versions_source_version_unique
    unique (source_id, version_hash),
  constraint legal_versions_provider_law_id_not_empty_check
    check (length(trim(provider_law_id)) > 0),
  constraint legal_versions_law_title_not_empty_check
    check (length(trim(law_title)) > 0),
  constraint legal_versions_version_hash_sha256_check
    check (version_hash ~ '^[0-9a-f]{64}$'),
  constraint legal_versions_raw_xml_sha256_check
    check (raw_xml_sha256 ~ '^[0-9a-f]{64}$'),
  constraint legal_versions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.legal_article_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.legal_sources(id) on delete cascade,
  version_id uuid not null references public.legal_versions(id) on delete cascade,
  provider_law_id text not null,
  law_title text not null,
  article_no text not null,
  article_title text,
  body_text text not null,
  normalized_text text not null,
  embedding_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_article_chunks_version_article_unique
    unique (version_id, article_no),
  constraint legal_article_chunks_provider_law_id_not_empty_check
    check (length(trim(provider_law_id)) > 0),
  constraint legal_article_chunks_law_title_not_empty_check
    check (length(trim(law_title)) > 0),
  constraint legal_article_chunks_article_no_not_empty_check
    check (length(trim(article_no)) > 0),
  constraint legal_article_chunks_body_text_not_empty_check
    check (length(trim(body_text)) > 0),
  constraint legal_article_chunks_normalized_text_not_empty_check
    check (length(trim(normalized_text)) > 0),
  constraint legal_article_chunks_embedding_text_not_empty_check
    check (length(trim(embedding_text)) > 0),
  constraint legal_article_chunks_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.legal_concept_nodes (
  id uuid primary key default gen_random_uuid(),
  concept_key text not null unique,
  exam_subject text not null,
  label text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_concept_nodes_concept_key_not_empty_check
    check (length(trim(concept_key)) > 0),
  constraint legal_concept_nodes_exam_subject_not_empty_check
    check (length(trim(exam_subject)) > 0),
  constraint legal_concept_nodes_label_not_empty_check
    check (length(trim(label)) > 0),
  constraint legal_concept_nodes_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.legal_concept_anchors (
  id uuid primary key default gen_random_uuid(),
  concept_node_id uuid not null references public.legal_concept_nodes(id) on delete cascade,
  article_chunk_id uuid not null references public.legal_article_chunks(id) on delete cascade,
  anchor_type text not null default 'primary_source',
  confidence numeric(4, 3) not null default 1.000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_concept_anchors_unique
    unique (concept_node_id, article_chunk_id, anchor_type),
  constraint legal_concept_anchors_anchor_type_not_empty_check
    check (length(trim(anchor_type)) > 0),
  constraint legal_concept_anchors_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint legal_concept_anchors_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.legal_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.legal_sources(id) on delete set null,
  status text not null,
  provider text not null default 'moleg_law_open_api',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  request_count integer not null default 0,
  article_count integer not null default 0,
  version_hash text,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint legal_sync_runs_status_check
    check (status in ('started', 'succeeded', 'failed')),
  constraint legal_sync_runs_provider_check
    check (provider = 'moleg_law_open_api'),
  constraint legal_sync_runs_request_count_check
    check (request_count >= 0),
  constraint legal_sync_runs_article_count_check
    check (article_count >= 0),
  constraint legal_sync_runs_version_hash_check
    check (version_hash is null or version_hash ~ '^[0-9a-f]{64}$'),
  constraint legal_sync_runs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists legal_sources_provider_law_id_idx
  on public.legal_sources (provider_law_id);

create index if not exists legal_sources_title_idx
  on public.legal_sources (title);

create index if not exists legal_versions_source_current_idx
  on public.legal_versions (source_id, is_current);

create index if not exists legal_versions_provider_law_id_idx
  on public.legal_versions (provider_law_id);

create index if not exists legal_article_chunks_source_idx
  on public.legal_article_chunks (source_id);

create index if not exists legal_article_chunks_version_idx
  on public.legal_article_chunks (version_id);

create index if not exists legal_article_chunks_law_article_idx
  on public.legal_article_chunks (law_title, article_no);

create index if not exists legal_concept_nodes_exam_subject_idx
  on public.legal_concept_nodes (exam_subject);

create index if not exists legal_concept_anchors_concept_node_idx
  on public.legal_concept_anchors (concept_node_id);

create index if not exists legal_concept_anchors_article_chunk_idx
  on public.legal_concept_anchors (article_chunk_id);

create index if not exists legal_sync_runs_source_started_idx
  on public.legal_sync_runs (source_id, started_at desc);

alter table public.legal_sources enable row level security;
alter table public.legal_versions enable row level security;
alter table public.legal_article_chunks enable row level security;
alter table public.legal_concept_nodes enable row level security;
alter table public.legal_concept_anchors enable row level security;
alter table public.legal_sync_runs enable row level security;

revoke all on table public.legal_sources from anon;
revoke all on table public.legal_versions from anon;
revoke all on table public.legal_article_chunks from anon;
revoke all on table public.legal_concept_nodes from anon;
revoke all on table public.legal_concept_anchors from anon;
revoke all on table public.legal_sync_runs from anon;
revoke all on table public.legal_sync_runs from authenticated;

grant usage on schema public to authenticated, service_role;

grant select on table public.legal_sources to authenticated;
grant select on table public.legal_versions to authenticated;
grant select on table public.legal_article_chunks to authenticated;
grant select on table public.legal_concept_nodes to authenticated;
grant select on table public.legal_concept_anchors to authenticated;

grant select, insert, update, delete on table public.legal_sources to service_role;
grant select, insert, update, delete on table public.legal_versions to service_role;
grant select, insert, update, delete on table public.legal_article_chunks to service_role;
grant select, insert, update, delete on table public.legal_concept_nodes to service_role;
grant select, insert, update, delete on table public.legal_concept_anchors to service_role;
grant select, insert, update, delete on table public.legal_sync_runs to service_role;

drop policy if exists "legal_sources_authenticated_read" on public.legal_sources;
create policy "legal_sources_authenticated_read"
  on public.legal_sources
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "legal_versions_authenticated_read" on public.legal_versions;
create policy "legal_versions_authenticated_read"
  on public.legal_versions
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "legal_article_chunks_authenticated_read" on public.legal_article_chunks;
create policy "legal_article_chunks_authenticated_read"
  on public.legal_article_chunks
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "legal_concept_nodes_authenticated_read" on public.legal_concept_nodes;
create policy "legal_concept_nodes_authenticated_read"
  on public.legal_concept_nodes
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "legal_concept_anchors_authenticated_read" on public.legal_concept_anchors;
create policy "legal_concept_anchors_authenticated_read"
  on public.legal_concept_anchors
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null);
