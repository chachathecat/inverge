-- Personal Concept Graph RPC-only write boundary v1.
-- Forward-only migration. Depends on public.transition_personal_concept_node_v1.

revoke insert, update on table public.personal_concept_nodes from authenticated;

-- Preserve the current learner lifecycle boundary: durable reads and user-owned
-- cleanup/deletion remain available, but concept-state writes must use the RPC.
grant select, delete on table public.personal_concept_nodes to authenticated;

drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;
drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;

revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from public;

revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from anon;

grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to authenticated;
