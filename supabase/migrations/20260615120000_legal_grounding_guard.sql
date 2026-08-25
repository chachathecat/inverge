-- Legal grounding guard v1
-- Authenticated read-only concept source anchor lookup for future legal explanation gating.

create or replace function public.get_legal_concept_source_anchors(
  concept_key_filter text default null,
  exam_subject_filter text default null,
  match_count integer default 12
)
returns table (
  concept_key text,
  concept_label text,
  exam_subject text,
  unit text,
  concept_metadata jsonb,
  anchor_type text,
  anchor_confidence numeric,
  anchor_metadata jsonb,
  law_title text,
  article_no text,
  article_key text,
  article_title text,
  body_text text,
  chunk_metadata jsonb,
  source_status text,
  needs_official_verification boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_input as (
    select
      nullif(trim(regexp_replace(coalesce(concept_key_filter, ''), '[[:space:]]+', ' ', 'g')), '') as normalized_concept_key,
      nullif(trim(regexp_replace(coalesce(exam_subject_filter, ''), '[[:space:]]+', ' ', 'g')), '') as normalized_exam_subject,
      greatest(1, least(coalesce(match_count, 12), 50)) as normalized_match_count
  )
  select
    n.concept_key,
    n.label as concept_label,
    n.exam_subject,
    n.metadata ->> 'unit' as unit,
    n.metadata as concept_metadata,
    a.anchor_type,
    a.confidence as anchor_confidence,
    a.metadata as anchor_metadata,
    c.law_title,
    c.article_no,
    c.article_key,
    c.article_title,
    c.body_text,
    c.metadata as chunk_metadata,
    coalesce(
      nullif(a.metadata ->> 'sourceStatus', ''),
      nullif(n.metadata ->> 'sourceStatus', ''),
      'draft'
    ) as source_status,
    coalesce(
      case lower(nullif(a.metadata ->> 'needsOfficialVerification', ''))
        when 'true' then true
        when 'false' then false
        else null
      end,
      case lower(nullif(n.metadata ->> 'needsOfficialVerification', ''))
        when 'true' then true
        when 'false' then false
        else null
      end,
      true
    ) as needs_official_verification
  from public.legal_concept_nodes n
  join public.legal_concept_anchors a
    on a.concept_node_id = n.id
  join public.legal_article_chunks c
    on c.id = a.article_chunk_id
  join public.legal_versions v
    on v.id = c.version_id
  cross join normalized_input i
  where
    v.is_current = true
    and (
      i.normalized_concept_key is null
      or n.concept_key = i.normalized_concept_key
    )
    and (
      i.normalized_exam_subject is null
      or n.exam_subject = i.normalized_exam_subject
    )
  order by
    n.concept_key asc,
    case
      when coalesce(a.metadata ->> 'sourceStatus', n.metadata ->> 'sourceStatus') = 'verified' then 0
      when coalesce(a.metadata ->> 'sourceStatus', n.metadata ->> 'sourceStatus') = 'draft' then 1
      else 2
    end asc,
    a.confidence desc,
    c.law_title asc,
    c.article_key asc
  limit (select normalized_match_count from normalized_input);
$$;

revoke all on function public.get_legal_concept_source_anchors(text, text, integer) from public;
revoke all on function public.get_legal_concept_source_anchors(text, text, integer) from anon;
grant execute on function public.get_legal_concept_source_anchors(text, text, integer) to authenticated;
