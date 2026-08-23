-- Personal Concept Graph early write-boundary compatibility v1.
-- Fresh-history replay reaches this file before the transition-function producer.
-- This step removes direct authenticated writes but does not install or claim the
-- final RPC-only function privilege boundary. The sole later C3R-P append must
-- reassert that boundary after the producer exists.

revoke insert, update on table public.personal_concept_nodes from authenticated;

-- Preserve durable reads and user-owned cleanup/deletion; neither permission is
-- a direct concept-state write path.
grant select, delete on table public.personal_concept_nodes to authenticated;

drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;
drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;
