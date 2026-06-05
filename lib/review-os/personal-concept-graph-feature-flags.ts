import { getPersonalConceptGraphRepositoryMode } from "./personal-concept-graph-repository-adapter";

export type PersonalConceptGraphFeatureFlagState = {
  repositoryMode: "memory" | "supabase";
  durableWritesEnabled: boolean;
  durableReadsEnabled: boolean;
};

export function arePersonalConceptGraphDurableWritesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPersonalConceptGraphRepositoryMode(env) === "supabase" && env.PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES === "1";
}

export function arePersonalConceptGraphDurableReadsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPersonalConceptGraphRepositoryMode(env) === "supabase" && env.PERSONAL_CONCEPT_GRAPH_DURABLE_READS === "1";
}

export function getPersonalConceptGraphFeatureFlagState(env: NodeJS.ProcessEnv = process.env): PersonalConceptGraphFeatureFlagState {
  return {
    repositoryMode: getPersonalConceptGraphRepositoryMode(env),
    durableWritesEnabled: arePersonalConceptGraphDurableWritesEnabled(env),
    durableReadsEnabled: arePersonalConceptGraphDurableReadsEnabled(env),
  };
}
