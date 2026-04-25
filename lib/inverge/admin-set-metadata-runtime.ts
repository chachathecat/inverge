import "server-only";

import { getAdminSetDetail, listAdminSets } from "@/lib/inverge/admin-set-metadata-repository";
import type { AdminQuestionMetadata, AdminSetDetailResponse, AdminSetSubjectId } from "@/lib/inverge/admin-set-metadata";

function toAlias(subjectId: AdminSetSubjectId, setId: string) {
  const subjectSlug = subjectId.replace(/_/g, "-");
  return `${subjectSlug}-${setId}`;
}

export function getRuntimeSetDetail(setId: string, subjectId?: AdminSetSubjectId): AdminSetDetailResponse | null {
  const direct = getAdminSetDetail(setId);
  if (direct?.set.active) {
    return {
      ...direct,
      questions: direct.questions.filter((question) => question.active),
    };
  }

  if (!subjectId) {
    return null;
  }

  const targetSetId = toAlias(subjectId, setId);
  const matched = listAdminSets(subjectId).sets.find((item) => item.setId === targetSetId || item.setId === setId);
  if (!matched || !matched.active) {
    return null;
  }

  const detail = getAdminSetDetail(matched.setId);
  if (!detail) {
    return null;
  }

  return {
    ...detail,
    questions: detail.questions.filter((question) => question.active),
  };
}

export function buildRuntimeQuestionConfigMap(detail: AdminSetDetailResponse | null) {
  const questionMap = new Map<string, AdminQuestionMetadata>();
  detail?.questions.forEach((question) => {
    questionMap.set(question.questionId, question);
  });
  return questionMap;
}
