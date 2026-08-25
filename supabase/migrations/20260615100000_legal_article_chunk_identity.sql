alter table public.legal_article_chunks
  add column if not exists article_key text;

update public.legal_article_chunks
set article_key = coalesce(
  nullif(metadata ->> 'joKey', ''),
  article_no || ':' || substring(encode(digest(normalized_text, 'sha256'), 'hex') from 1 for 12)
)
where article_key is null or length(trim(article_key)) = 0;

alter table public.legal_article_chunks
  alter column article_key set not null;

alter table public.legal_article_chunks
  drop constraint if exists legal_article_chunks_version_article_unique;

alter table public.legal_article_chunks
  add constraint legal_article_chunks_version_article_key_unique
    unique (version_id, article_key);

alter table public.legal_article_chunks
  drop constraint if exists legal_article_chunks_article_key_not_empty_check;

alter table public.legal_article_chunks
  add constraint legal_article_chunks_article_key_not_empty_check
    check (length(trim(article_key)) > 0);
