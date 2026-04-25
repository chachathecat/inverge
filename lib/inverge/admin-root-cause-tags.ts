import type { RootCauseGroup, RootCauseTagDefinition, RootCauseTagId, SubjectId } from "@/lib/appraisal-first/types";
import { CIVIL_LAW_ROOT_CAUSE_TAGS } from "@/lib/appraisal-first/civil-law/root-cause-tags";
import { LEGAL_REGULATIONS_ROOT_CAUSE_TAGS } from "@/lib/appraisal-first/legal-regulations/root-cause-tags";

export type AdminRootCauseSubjectId = Extract<SubjectId, "civil_law" | "appraisal_law">;

export type AdminRootCauseTag = RootCauseTagDefinition & {
  id: string;
  subjectId: AdminRootCauseSubjectId;
  category: RootCauseGroup;
  active: boolean;
  operatorNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminRootCauseTagSaveInput = Omit<AdminRootCauseTag, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type AdminRootCauseTagListResponse = {
  subjectId: AdminRootCauseSubjectId;
  tags: AdminRootCauseTag[];
  groups: Array<{
    group: RootCauseGroup;
    activeCount: number;
    totalCount: number;
  }>;
};

export const ADMIN_ROOT_CAUSE_SUBJECTS: Array<{ id: AdminRootCauseSubjectId; label: string }> = [
  { id: "civil_law", label: "민법" },
  { id: "appraisal_law", label: "감정평가 관계법규" },
];

export const ROOT_CAUSE_GROUPS: RootCauseGroup[] = [
  "concept_gap",
  "condition_logic_failure",
  "exception_missed",
  "similar_concept_confusion",
  "choice_judgment_error",
  "case_application_failure",
  "confidence_issue",
  "article_memory_gap",
  "time_pressure_guess",
];

function nowIso() {
  return new Date().toISOString();
}

function seedTag(subjectId: AdminRootCauseSubjectId, tag: RootCauseTagDefinition): AdminRootCauseTag {
  const now = nowIso();

  return {
    ...tag,
    id: `${subjectId}:${tag.tagId}`,
    subjectId,
    category: tag.group,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSeedRootCauseTags(subjectId: AdminRootCauseSubjectId): AdminRootCauseTag[] {
  const source = subjectId === "civil_law" ? CIVIL_LAW_ROOT_CAUSE_TAGS : LEGAL_REGULATIONS_ROOT_CAUSE_TAGS;
  return source.map((tag) => seedTag(subjectId, tag));
}

export function isAdminRootCauseSubjectId(value: unknown): value is AdminRootCauseSubjectId {
  return value === "civil_law" || value === "appraisal_law";
}

export function isRootCauseGroup(value: unknown): value is RootCauseGroup {
  return ROOT_CAUSE_GROUPS.includes(value as RootCauseGroup);
}

export function buildRootCauseGroups(tags: AdminRootCauseTag[]): AdminRootCauseTagListResponse["groups"] {
  return ROOT_CAUSE_GROUPS.map((group) => {
    const groupTags = tags.filter((tag) => tag.group === group);
    return {
      group,
      activeCount: groupTags.filter((tag) => tag.active).length,
      totalCount: groupTags.length,
    };
  }).filter((group) => group.totalCount > 0);
}

export function toDiagnosisRootCauseTags(tags: AdminRootCauseTag[]): RootCauseTagDefinition[] {
  return tags
    .filter((tag) => tag.active)
    .map((tag) => ({
      tagId: tag.tagId,
      group: tag.group,
      internalName: tag.internalName,
      userLabel: tag.userLabel,
      summaryLabel: tag.summaryLabel,
      reviewPriorityWeight: tag.reviewPriorityWeight,
      reviewAction: tag.reviewAction,
      coachingTemplate: tag.coachingTemplate,
      isUserVisible: tag.isUserVisible,
    }));
}

export function normalizeRootCauseTagId(value: string): RootCauseTagId {
  return value as RootCauseTagId;
}
