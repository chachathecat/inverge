import "server-only";

import {
  buildRootCauseGroups,
  getSeedRootCauseTags,
  isAdminRootCauseSubjectId,
  type AdminRootCauseSubjectId,
  type AdminRootCauseTag,
  type AdminRootCauseTagListResponse,
  type AdminRootCauseTagSaveInput,
} from "@/lib/inverge/admin-root-cause-tags";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

type PersistedRootCauseTagStore = Record<AdminRootCauseSubjectId, AdminRootCauseTag[]>;

type AdminRootCauseTagRepository = {
  list(subjectId: AdminRootCauseSubjectId): AdminRootCauseTagListResponse;
  save(input: AdminRootCauseTagSaveInput): AdminRootCauseTag;
  setActive(input: { subjectId: AdminRootCauseSubjectId; id: string; active: boolean }): AdminRootCauseTag | null;
};

const store = createJsonFileRepository<PersistedRootCauseTagStore>("admin-root-cause-tags.json", () => ({
  civil_law: getSeedRootCauseTags("civil_law"),
  appraisal_law: getSeedRootCauseTags("appraisal_law"),
}));

function ensureSubject(data: PersistedRootCauseTagStore, subjectId: AdminRootCauseSubjectId) {
  const existing = data[subjectId];
  if (existing) return existing;

  const seeded = getSeedRootCauseTags(subjectId);
  data[subjectId] = seeded;
  return seeded;
}

function sortTags(tags: AdminRootCauseTag[]) {
  return [...tags].sort((a, b) => {
    const groupDelta = a.group.localeCompare(b.group, "ko");
    if (groupDelta !== 0) return groupDelta;

    if (a.reviewPriorityWeight !== b.reviewPriorityWeight) {
      return b.reviewPriorityWeight - a.reviewPriorityWeight;
    }

    return a.tagId.localeCompare(b.tagId, "ko");
  });
}

const repository: AdminRootCauseTagRepository = {
  list(subjectId) {
    const data = store.read();
    const tags = sortTags(ensureSubject(data, subjectId));

    return {
      subjectId,
      tags,
      groups: buildRootCauseGroups(tags),
    };
  },

  save(input) {
    const subjectId = isAdminRootCauseSubjectId(input.subjectId) ? input.subjectId : "civil_law";

    return store.update((data) => {
      const tags = ensureSubject(data, subjectId);
      const now = new Date().toISOString();
      const id = input.id ?? `${subjectId}:${input.tagId}`;
      const existing = tags.find((tag) => tag.id === id);
      const saved: AdminRootCauseTag = {
        ...input,
        id,
        subjectId,
        category: input.group,
        active: input.active,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const nextTags = existing ? tags.map((tag) => (tag.id === id ? saved : tag)) : [saved, ...tags];

      return {
        next: {
          ...data,
          [subjectId]: nextTags,
        },
        result: saved,
      };
    });
  },

  setActive({ subjectId, id, active }) {
    const target = repository.list(subjectId).tags.find((tag) => tag.id === id);
    if (!target) return null;
    return repository.save({ ...target, active });
  },
};

export function listAdminRootCauseTags(subjectId: AdminRootCauseSubjectId): AdminRootCauseTagListResponse {
  return repository.list(subjectId);
}

export function saveAdminRootCauseTag(input: AdminRootCauseTagSaveInput): AdminRootCauseTag {
  return repository.save(input);
}

export function setAdminRootCauseTagActive(input: {
  subjectId: AdminRootCauseSubjectId;
  id: string;
  active: boolean;
}) {
  return repository.setActive(input);
}
