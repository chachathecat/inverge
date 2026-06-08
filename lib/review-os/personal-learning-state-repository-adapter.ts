import {
  InMemoryPersonalLearningStateRepository,
  type PersonalLearningStateRepository,
} from "./personal-learning-state-repository";

export type PersonalLearningStateRepositoryMode = "memory" | "supabase";

type PersonalLearningStateSupabaseRepository = typeof import("./personal-learning-state-supabase-repository");

const memoryRepository = new InMemoryPersonalLearningStateRepository();

async function getSupabaseRepository(): Promise<PersonalLearningStateSupabaseRepository> {
  return import("./personal-learning-state-supabase-repository");
}

export function getPersonalLearningStateRepositoryMode(env: NodeJS.ProcessEnv = process.env): PersonalLearningStateRepositoryMode {
  return env.PERSONAL_LEARNING_STATE_REPOSITORY === "supabase" ? "supabase" : "memory";
}

export function isDurablePersonalLearningStateEnabled(env: NodeJS.ProcessEnv = process.env) {
  return getPersonalLearningStateRepositoryMode(env) === "supabase" && env.PERSONAL_LEARNING_STATE_DURABLE_READS === "1" && env.PERSONAL_LEARNING_STATE_DURABLE_WRITES === "1";
}

export function areDurablePersonalLearningStateWritesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return getPersonalLearningStateRepositoryMode(env) === "supabase" && env.PERSONAL_LEARNING_STATE_DURABLE_WRITES === "1";
}

export function areDurablePersonalLearningStateReadsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return getPersonalLearningStateRepositoryMode(env) === "supabase" && env.PERSONAL_LEARNING_STATE_DURABLE_READS === "1";
}

export function getPersonalLearningStateRepository(env: NodeJS.ProcessEnv = process.env): PersonalLearningStateRepository & { mode: PersonalLearningStateRepositoryMode } {
  const mode = getPersonalLearningStateRepositoryMode(env);

  if (mode === "supabase") {
    return {
      mode,
      upsertLearningState: async (...args) => (await getSupabaseRepository()).upsertLearningStateToSupabase(...args),
      getLearningState: async (...args) => (await getSupabaseRepository()).getLearningStateFromSupabase(...args),
      listDueLearningStates: async (...args) => (await getSupabaseRepository()).listDueLearningStatesFromSupabase(...args),
      listLearningStatesByStatus: async (...args) => (await getSupabaseRepository()).listLearningStatesByStatusFromSupabase(...args),
      deleteLearningStateForTest: async (...args) => (await getSupabaseRepository()).deleteLearningStateFromSupabaseForTest(...args),
    };
  }

  return {
    mode: "memory",
    upsertLearningState: (...args) => memoryRepository.upsertLearningState(...args),
    getLearningState: (...args) => memoryRepository.getLearningState(...args),
    listDueLearningStates: (...args) => memoryRepository.listDueLearningStates(...args),
    listLearningStatesByStatus: (...args) => memoryRepository.listLearningStatesByStatus(...args),
    deleteLearningStateForTest: (...args) => memoryRepository.deleteLearningStateForTest(...args),
  };
}
