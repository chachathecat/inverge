import "server-only";

import {
  buildCurriculumNodes,
  getSeedCurriculumMappings,
  isAdminCurriculumSubjectId,
  type AdminCurriculumMapping,
  type AdminCurriculumSubjectId,
  type CurriculumMappingListResponse,
  type CurriculumMappingSaveInput,
} from "@/lib/inverge/admin-curriculum";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

type PersistedCurriculumStore = Record<AdminCurriculumSubjectId, AdminCurriculumMapping[]>;

type AdminCurriculumRepository = {
  list(subjectId: AdminCurriculumSubjectId): CurriculumMappingListResponse;
  save(input: CurriculumMappingSaveInput): AdminCurriculumMapping;
  setActive(input: { subjectId: AdminCurriculumSubjectId; id: string; active: boolean }): AdminCurriculumMapping | null;
};

const store = createJsonFileRepository<PersistedCurriculumStore>("admin-curriculum-mappings.json", () => ({
  civil_law: getSeedCurriculumMappings("civil_law"),
  appraisal_law: getSeedCurriculumMappings("appraisal_law"),
}));

function sortMappings(mappings: AdminCurriculumMapping[]) {
  return [...mappings].sort((a, b) =>
    `${a.chapterName}:${a.topicName}:${a.subtopicName}:${a.questionId}`.localeCompare(
      `${b.chapterName}:${b.topicName}:${b.subtopicName}:${b.questionId}`,
      "ko",
    ),
  );
}

function ensureSubject(data: PersistedCurriculumStore, subjectId: AdminCurriculumSubjectId) {
  const existing = data[subjectId];
  if (existing) return existing;

  const seeded = getSeedCurriculumMappings(subjectId);
  data[subjectId] = seeded;
  return seeded;
}

const repository: AdminCurriculumRepository = {
  list(subjectId) {
    const data = store.read();
    const mappings = sortMappings(ensureSubject(data, subjectId));

    return {
      subjectId,
      mappings,
      nodes: buildCurriculumNodes(mappings),
    };
  },

  save(input) {
    const subjectId = isAdminCurriculumSubjectId(input.subjectId) ? input.subjectId : "civil_law";

    return store.update((data) => {
      const mappings = ensureSubject(data, subjectId);
      const now = new Date().toISOString();
      const id = input.id ?? `${subjectId}:${input.questionId}`;
      const existing = mappings.find((mapping) => mapping.id === id);
      const saved: AdminCurriculumMapping = {
        ...input,
        id,
        subjectId,
        linkedNodeIds: input.linkedNodeIds ?? [],
        defaultRootCauseTags: input.defaultRootCauseTags ?? [],
        active: input.active,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const nextMappings = existing
        ? mappings.map((mapping) => (mapping.id === id ? saved : mapping))
        : [saved, ...mappings];

      return {
        next: {
          ...data,
          [subjectId]: nextMappings,
        },
        result: saved,
      };
    });
  },

  setActive({ subjectId, id, active }) {
    const target = repository.list(subjectId).mappings.find((mapping) => mapping.id === id);
    if (!target) return null;
    return repository.save({ ...target, active });
  },
};

export function listAdminCurriculumMappings(subjectId: AdminCurriculumSubjectId): CurriculumMappingListResponse {
  return repository.list(subjectId);
}

export function saveAdminCurriculumMapping(input: CurriculumMappingSaveInput): AdminCurriculumMapping {
  return repository.save(input);
}

export function setAdminCurriculumMappingActive(input: {
  subjectId: AdminCurriculumSubjectId;
  id: string;
  active: boolean;
}) {
  return repository.setActive(input);
}
