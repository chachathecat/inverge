import "server-only";

import {
  getSeedSetRecords,
  isAdminSetSubjectId,
  type AdminQuestionMetadata,
  type AdminQuestionMetadataSaveInput,
  type AdminSetDetailResponse,
  type AdminSetListItem,
  type AdminSetListResponse,
  type AdminSetMetadata,
  type AdminSetMetadataSaveInput,
  type AdminSetRecord,
  type AdminSetSubjectId,
} from "@/lib/inverge/admin-set-metadata";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

type PersistedSetStore = {
  records: AdminSetRecord[];
};

type AdminSetMetadataRepository = {
  list(subjectId?: AdminSetSubjectId | "all"): AdminSetListResponse;
  getDetail(setId: string): AdminSetDetailResponse | null;
  saveSet(input: AdminSetMetadataSaveInput): AdminSetMetadata;
  saveQuestion(input: AdminQuestionMetadataSaveInput): AdminQuestionMetadata;
  setSetActive(input: { setId: string; active: boolean }): AdminSetMetadata | null;
  setQuestionActive(input: { setId: string; questionId: string; active: boolean }): AdminQuestionMetadata | null;
};

const store = createJsonFileRepository<PersistedSetStore>("admin-set-metadata.json", () => ({
  records: getSeedSetRecords(),
}));

function sortList(items: AdminSetListItem[]) {
  return [...items].sort((a, b) => `${a.subjectId}:${a.setTitle}`.localeCompare(`${b.subjectId}:${b.setTitle}`, "ko"));
}

function findRecord(data: PersistedSetStore, setId: string) {
  return data.records.find((record) => record.set.setId === setId);
}

function toListItem(record: AdminSetRecord): AdminSetListItem {
  return {
    ...record.set,
    questionCount: record.questions.length,
    activeQuestionCount: record.questions.filter((question) => question.active).length,
    connectedCurriculumCount: record.questions.filter((question) => question.curriculumNodeIds.length > 0).length,
  };
}

const repository: AdminSetMetadataRepository = {
  list(subjectId = "all") {
    const data = store.read();
    const items = data.records
      .filter((record) => (subjectId === "all" ? true : record.set.subjectId === subjectId))
      .map(toListItem);

    return {
      subjectId,
      sets: sortList(items),
    };
  },

  getDetail(setId) {
    const record = findRecord(store.read(), setId);
    if (!record) return null;

    return {
      set: record.set,
      questions: [...record.questions].sort((a, b) => a.number - b.number),
      summary: {
        totalQuestions: record.questions.length,
        activeQuestions: record.questions.filter((question) => question.active).length,
        connectedQuestions: record.questions.filter((question) => question.curriculumNodeIds.length > 0).length,
      },
    };
  },

  saveSet(input) {
    return store.update((data) => {
      const existing = findRecord(data, input.setId);
      const now = new Date().toISOString();
      const savedSet: AdminSetMetadata = {
        id: input.id ?? input.setId,
        setId: input.setId,
        setTitle: input.setTitle.trim(),
        examId: input.examId.trim(),
        subjectId: isAdminSetSubjectId(input.subjectId) ? input.subjectId : "civil_law",
        sourceLabel: input.sourceLabel.trim(),
        sourceYear: input.sourceYear,
        timeLimitMinutes: Math.max(1, Number(input.timeLimitMinutes) || 12),
        active: input.active,
        operatorNote: input.operatorNote?.trim(),
        createdAt: existing?.set.createdAt ?? now,
        updatedAt: now,
      };

      const nextRecords = existing
        ? data.records.map((record) =>
            record.set.setId === input.setId
              ? {
                  set: savedSet,
                  questions: record.questions.map((question) => ({
                    ...question,
                    subjectId: savedSet.subjectId,
                    setId: savedSet.setId,
                    updatedAt: now,
                  })),
                }
              : record,
          )
        : [...data.records, { set: savedSet, questions: [] }];

      return {
        next: { records: nextRecords },
        result: savedSet,
      };
    });
  },

  saveQuestion(input) {
    return store.update((data) => {
      const record = findRecord(data, input.setId);
      if (!record) {
        throw new Error("set-not-found");
      }

      const now = new Date().toISOString();
      const id = input.id ?? `${input.setId}:${input.questionId}`;
      const existing = record.questions.find((question) => question.id === id);
      const savedQuestion: AdminQuestionMetadata = {
        id,
        questionId: input.questionId.trim(),
        setId: input.setId,
        number: Math.max(1, Number(input.number) || 1),
        subjectId: isAdminSetSubjectId(input.subjectId) ? input.subjectId : record.set.subjectId,
        unit: input.unit.trim(),
        difficulty: input.difficulty,
        curriculumNodeIds: input.curriculumNodeIds,
        expectedTimeSeconds: Math.max(10, Number(input.expectedTimeSeconds) || 90),
        timeOveruseThresholdSeconds: Math.max(10, Number(input.timeOveruseThresholdSeconds) || 120),
        reviewCandidateFlags: input.reviewCandidateFlags,
        active: input.active,
        operatorNote: input.operatorNote?.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const nextQuestions = existing
        ? record.questions.map((question) => (question.id === id ? savedQuestion : question))
        : [...record.questions, savedQuestion];
      const nextRecords = data.records.map((item) =>
        item.set.setId === input.setId
          ? {
              ...item,
              questions: nextQuestions,
            }
          : item,
      );

      return {
        next: { records: nextRecords },
        result: savedQuestion,
      };
    });
  },

  setSetActive({ setId, active }) {
    const detail = repository.getDetail(setId);
    if (!detail) return null;
    return repository.saveSet({ ...detail.set, active });
  },

  setQuestionActive({ setId, questionId, active }) {
    const detail = repository.getDetail(setId);
    const question = detail?.questions.find((item) => item.questionId === questionId);
    if (!question) return null;
    return repository.saveQuestion({ ...question, active });
  },
};

export function listAdminSets(subjectId: AdminSetSubjectId | "all" = "all"): AdminSetListResponse {
  return repository.list(subjectId);
}

export function getAdminSetDetail(setId: string): AdminSetDetailResponse | null {
  return repository.getDetail(setId);
}

export function saveAdminSetMetadata(input: AdminSetMetadataSaveInput): AdminSetMetadata {
  return repository.saveSet(input);
}

export function saveAdminQuestionMetadata(input: AdminQuestionMetadataSaveInput): AdminQuestionMetadata {
  return repository.saveQuestion(input);
}

export function setAdminSetActive(input: { setId: string; active: boolean }) {
  return repository.setSetActive(input);
}

export function setAdminQuestionActive(input: { setId: string; questionId: string; active: boolean }) {
  return repository.setQuestionActive(input);
}
