import {
  getPersonalConceptNode,
  listPersonalConceptNodesForToday,
  upsertPersonalConceptNode,
} from "./personal-concept-graph-repository";

export type PersonalConceptGraphRepositoryMode = "memory" | "supabase";

type PersonalConceptGraphSupabaseRepository = typeof import("./personal-concept-graph-supabase-repository");

async function getSupabaseRepository(): Promise<PersonalConceptGraphSupabaseRepository> {
  return import("./personal-concept-graph-supabase-repository");
}

export type PersonalConceptGraphRepositoryAdapter = {
  mode: PersonalConceptGraphRepositoryMode;
  getPersonalConceptNode: typeof getPersonalConceptNode | PersonalConceptGraphSupabaseRepository["getPersonalConceptNodeFromSupabase"];
  upsertPersonalConceptNode: typeof upsertPersonalConceptNode | PersonalConceptGraphSupabaseRepository["upsertPersonalConceptNodeToSupabase"];
  listPersonalConceptNodesForToday: typeof listPersonalConceptNodesForToday | PersonalConceptGraphSupabaseRepository["listPersonalConceptNodesForTodayFromSupabase"];
  deletePersonalConceptNode?: PersonalConceptGraphSupabaseRepository["deletePersonalConceptNodeFromSupabase"];
};

export function getPersonalConceptGraphRepositoryMode(env: NodeJS.ProcessEnv = process.env): PersonalConceptGraphRepositoryMode {
  return env.PERSONAL_CONCEPT_GRAPH_REPOSITORY === "supabase" ? "supabase" : "memory";
}

export function getPersonalConceptGraphRepositoryAdapter(env: NodeJS.ProcessEnv = process.env): PersonalConceptGraphRepositoryAdapter {
  const mode = getPersonalConceptGraphRepositoryMode(env);

  if (mode === "supabase") {
    return {
      mode,
      getPersonalConceptNode: async (...args) => (await getSupabaseRepository()).getPersonalConceptNodeFromSupabase(...args),
      upsertPersonalConceptNode: async (...args) => (await getSupabaseRepository()).upsertPersonalConceptNodeToSupabase(...args),
      listPersonalConceptNodesForToday: async (...args) => (await getSupabaseRepository()).listPersonalConceptNodesForTodayFromSupabase(...args),
      deletePersonalConceptNode: async (...args) => (await getSupabaseRepository()).deletePersonalConceptNodeFromSupabase(...args),
    };
  }

  return {
    mode: "memory",
    getPersonalConceptNode,
    upsertPersonalConceptNode,
    listPersonalConceptNodesForToday,
  };
}
