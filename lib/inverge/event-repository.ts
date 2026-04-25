import "server-only";

import type { InvergeEventEnvelope } from "@/lib/inverge/events";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

const MAX_SERVER_EVENTS = 1000;

type PersistedEventStore = {
  events: InvergeEventEnvelope[];
};

type EventRepository = {
  append(event: InvergeEventEnvelope): void;
  list(limit?: number): InvergeEventEnvelope[];
};

const store = createJsonFileRepository<PersistedEventStore>("events.json", () => ({
  events: [],
}));

const repository: EventRepository = {
  append(event) {
    store.update((data) => ({
      next: {
        events: [event, ...data.events].slice(0, MAX_SERVER_EVENTS),
      },
      result: undefined,
    }));
  },

  list(limit = 100) {
    return store.read().events.slice(0, Math.max(1, Math.min(limit, MAX_SERVER_EVENTS)));
  },
};

export function appendInvergeEvent(event: InvergeEventEnvelope) {
  repository.append(event);
}

export function listInvergeEvents(limit = 100) {
  return repository.list(limit);
}
