-- Legal retrieval v1
-- Authenticated read-only keyword retrieval over current official law article chunks.

create or replace function public.search_legal_chunks_keyword(
  query_text text,
  law_title_filter text default null,
  match_count integer default 8
)
returns table (
  id uuid,
  source_id uuid,
  version_id uuid,
  law_title text,
  article_no text,
  article_key text,
  article_title text,
  body_text text,
  metadata jsonb,
  rank_score double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_input as (
    select
      nullif(trim(regexp_replace(translate(coalesce(query_text, ''), '%_', '  '), '[[:space:]]+', ' ', 'g')), '') as normalized_query,
      nullif(trim(regexp_replace(translate(coalesce(law_title_filter, ''), '%_', '  '), '[[:space:]]+', ' ', 'g')), '') as normalized_law_title,
      greatest(1, least(coalesce(match_count, 8), 20)) as normalized_match_count
  ),
  query_terms as (
    select
      normalized_query,
      normalized_law_title,
      normalized_match_count,
      array(
        select term
        from unnest(regexp_split_to_array(normalized_query, '[[:space:]]+')) as term
        where length(term) >= 2
      ) as terms
    from normalized_input
    where normalized_query is not null
  ),
  ranked_chunks as (
    select
      c.id,
      c.source_id,
      c.version_id,
      c.law_title,
      c.article_no,
      c.article_key,
      c.article_title,
      c.body_text,
      c.metadata,
      (
        case when c.normalized_text ilike '%' || q.normalized_query || '%' then 6 else 0 end +
        case when c.body_text ilike '%' || q.normalized_query || '%' then 5 else 0 end +
        case when coalesce(c.article_title, '') ilike '%' || q.normalized_query || '%' then 3 else 0 end +
        case when c.article_no ilike '%' || q.normalized_query || '%' then 2 else 0 end +
        case when c.law_title ilike '%' || q.normalized_query || '%' then 1 else 0 end +
        coalesce((
          select count(*)::integer
          from unnest(q.terms) as term
          where
            c.normalized_text ilike '%' || term || '%'
            or c.body_text ilike '%' || term || '%'
            or coalesce(c.article_title, '') ilike '%' || term || '%'
            or c.article_no ilike '%' || term || '%'
        ), 0)
      )::double precision as rank_score,
      q.normalized_match_count
    from public.legal_article_chunks c
    join public.legal_versions v
      on v.id = c.version_id
    cross join query_terms q
    where
      v.is_current = true
      and (
        q.normalized_law_title is null
        or c.law_title ilike '%' || q.normalized_law_title || '%'
      )
      and (
        c.normalized_text ilike '%' || q.normalized_query || '%'
        or c.body_text ilike '%' || q.normalized_query || '%'
        or coalesce(c.article_title, '') ilike '%' || q.normalized_query || '%'
        or c.article_no ilike '%' || q.normalized_query || '%'
        or c.law_title ilike '%' || q.normalized_query || '%'
        or exists (
          select 1
          from unnest(q.terms) as term
          where
            c.normalized_text ilike '%' || term || '%'
            or c.body_text ilike '%' || term || '%'
            or coalesce(c.article_title, '') ilike '%' || term || '%'
            or c.article_no ilike '%' || term || '%'
        )
      )
  )
  select
    id,
    source_id,
    version_id,
    law_title,
    article_no,
    article_key,
    article_title,
    body_text,
    metadata,
    rank_score
  from ranked_chunks
  where rank_score > 0
  order by rank_score desc, law_title asc, article_key asc
  limit (select normalized_match_count from query_terms limit 1);
$$;

revoke all on function public.search_legal_chunks_keyword(text, text, integer) from public;
revoke all on function public.search_legal_chunks_keyword(text, text, integer) from anon;
grant execute on function public.search_legal_chunks_keyword(text, text, integer) to authenticated;
