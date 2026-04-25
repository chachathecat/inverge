import type { CivilLawCurriculumMapping, SubjectId } from "@/lib/appraisal-first/types";
import { CIVIL_LAW_CURRICULUM_MAPPINGS } from "@/lib/appraisal-first/civil-law/curriculum";
import { LEGAL_REGULATIONS_CURRICULUM_MAPPINGS } from "@/lib/appraisal-first/legal-regulations/curriculum";

export type AdminCurriculumSubjectId = Extract<SubjectId, "civil_law" | "appraisal_law">;

export type AdminCurriculumMapping = CivilLawCurriculumMapping & {
  id: string;
  subjectId: AdminCurriculumSubjectId;
  active: boolean;
  operatorNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumNodeSummary = {
  nodeId: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  activeQuestionCount: number;
  totalQuestionCount: number;
};

export type CurriculumMappingListResponse = {
  subjectId: AdminCurriculumSubjectId;
  mappings: AdminCurriculumMapping[];
  nodes: CurriculumNodeSummary[];
};

export type CurriculumMappingSaveInput = Omit<AdminCurriculumMapping, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export const ADMIN_CURRICULUM_SUBJECTS: Array<{ id: AdminCurriculumSubjectId; label: string }> = [
  { id: "civil_law", label: "민법" },
  { id: "appraisal_law", label: "감정평가 관계법규" },
];

function nowIso() {
  return new Date().toISOString();
}

function seedMapping(subjectId: AdminCurriculumSubjectId, mapping: CivilLawCurriculumMapping): AdminCurriculumMapping {
  const now = nowIso();

  return {
    ...mapping,
    id: `${subjectId}:${mapping.questionId}`,
    subjectId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSeedCurriculumMappings(subjectId: AdminCurriculumSubjectId): AdminCurriculumMapping[] {
  const source =
    subjectId === "civil_law"
      ? CIVIL_LAW_CURRICULUM_MAPPINGS
      : LEGAL_REGULATIONS_CURRICULUM_MAPPINGS;

  return source.map((mapping) => seedMapping(subjectId, mapping));
}

export function isAdminCurriculumSubjectId(value: unknown): value is AdminCurriculumSubjectId {
  return value === "civil_law" || value === "appraisal_law";
}

export function buildCurriculumNodes(mappings: AdminCurriculumMapping[]): CurriculumNodeSummary[] {
  const nodeMap = new Map<string, CurriculumNodeSummary>();

  mappings.forEach((mapping) => {
    const existing = nodeMap.get(mapping.primaryNodeId);
    if (existing) {
      existing.totalQuestionCount += 1;
      if (mapping.active) existing.activeQuestionCount += 1;
      return;
    }

    nodeMap.set(mapping.primaryNodeId, {
      nodeId: mapping.primaryNodeId,
      chapterId: mapping.chapterId,
      chapterName: mapping.chapterName,
      topicId: mapping.topicId,
      topicName: mapping.topicName,
      subtopicId: mapping.subtopicId,
      subtopicName: mapping.subtopicName,
      activeQuestionCount: mapping.active ? 1 : 0,
      totalQuestionCount: 1,
    });
  });

  return Array.from(nodeMap.values()).sort((a, b) =>
    `${a.chapterName}:${a.topicName}:${a.subtopicName}`.localeCompare(
      `${b.chapterName}:${b.topicName}:${b.subtopicName}`,
      "ko",
    ),
  );
}

export function toDiagnosisCurriculumMappings(mappings: AdminCurriculumMapping[]): CivilLawCurriculumMapping[] {
  return mappings
    .filter((mapping) => mapping.active)
    .map((mapping) => ({
      questionId: mapping.questionId,
      primaryNodeId: mapping.primaryNodeId,
      linkedNodeIds: mapping.linkedNodeIds,
      chapterId: mapping.chapterId,
      chapterName: mapping.chapterName,
      topicId: mapping.topicId,
      topicName: mapping.topicName,
      subtopicId: mapping.subtopicId,
      subtopicName: mapping.subtopicName,
      correctChoiceId: mapping.correctChoiceId,
      expectedSeconds: mapping.expectedSeconds,
      difficulty: mapping.difficulty,
      examWeight: mapping.examWeight,
      reviewWeight: mapping.reviewWeight,
      coachingWeight: mapping.coachingWeight,
      testedConceptType: mapping.testedConceptType,
      requiresArticleMemory: mapping.requiresArticleMemory,
      requiresCaseLogic: mapping.requiresCaseLogic,
      requiresComparison: mapping.requiresComparison,
      mappingConfidence: mapping.mappingConfidence,
      defaultRootCauseTags: mapping.defaultRootCauseTags,
    }));
}
