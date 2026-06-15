-- Legal grounding guard v1
-- Preserve operator-only write-path support via service role for concept anchor lookups.

revoke all on function public.get_legal_concept_source_anchors(text, text, integer) from public;
revoke all on function public.get_legal_concept_source_anchors(text, text, integer) from anon;
grant execute on function public.get_legal_concept_source_anchors(text, text, integer) to service_role;
