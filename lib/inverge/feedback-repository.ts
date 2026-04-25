import "server-only";

import type { FeedbackResponse } from "@/lib/inverge/feedback";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

const MAX_FEEDBACK_RESPONSES = 500;

type PersistedFeedbackStore = {
  responses: FeedbackResponse[];
};

type FeedbackRepository = {
  append(response: FeedbackResponse): void;
  list(limit?: number): FeedbackResponse[];
};

const store = createJsonFileRepository<PersistedFeedbackStore>("feedback-responses.json", () => ({
  responses: [],
}));

const repository: FeedbackRepository = {
  append(response) {
    store.update((data) => ({
      next: {
        responses: [response, ...data.responses].slice(0, MAX_FEEDBACK_RESPONSES),
      },
      result: undefined,
    }));
  },

  list(limit = 100) {
    return store.read().responses.slice(0, Math.max(1, Math.min(limit, MAX_FEEDBACK_RESPONSES)));
  },
};

export function appendFeedbackResponse(response: FeedbackResponse) {
  repository.append(response);
}

export function listFeedbackResponses(limit = 100) {
  return repository.list(limit);
}
