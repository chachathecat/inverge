import {
  diagnoseSecondExamAnswer,
  type GapType,
  type SecondExamRewriteSeed,
  type SecondExamSubjectId,
} from "@/lib/inverge/second-exam-diagnosis";

export type RewriteSeedTemplateStatus = "active" | "inactive";

export type AdminRewriteSeedTemplate = {
  id: string;
  subjectId: SecondExamSubjectId;
  gapType: GapType;
  focusLabel: string;
  gapTitle: string;
  gapSummary: string;
  rewriteInstruction: string;
  guidanceTitle: string;
  guidance: string[];
  placeholder: string;
  starter: string;
  minimumLength: number;
  active: boolean;
  operatorNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminRewriteSeedTemplateSaveInput = Omit<
  AdminRewriteSeedTemplate,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type AdminRewriteSeedTemplateListResponse = {
  subjects: typeof SECOND_EXAM_ADMIN_SUBJECTS;
  gapTypes: typeof SECOND_EXAM_GAP_TYPES;
  templates: AdminRewriteSeedTemplate[];
  summary: {
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
  };
};

export const SECOND_EXAM_ADMIN_SUBJECTS = [
  { id: "practice", label: "Practice" },
  { id: "theory", label: "Theory" },
  { id: "law", label: "Law" },
] as const satisfies readonly { id: SecondExamSubjectId; label: string }[];

export const SECOND_EXAM_GAP_TYPES = [
  "issue-missing",
  "structure-gap",
  "weak-opening",
  "weak-conclusion",
] as const satisfies readonly GapType[];

export function isSecondExamAdminSubjectId(value: string): value is SecondExamSubjectId {
  return value === "practice" || value === "theory" || value === "law";
}

export function isSecondExamGapType(value: string): value is GapType {
  return SECOND_EXAM_GAP_TYPES.some((gapType) => gapType === value);
}

export function buildRewriteSeedTemplateId(subjectId: SecondExamSubjectId, gapType: GapType) {
  return `${subjectId}:${gapType}`;
}

export function toRewriteSeedPatch(template: AdminRewriteSeedTemplate): Pick<
  SecondExamRewriteSeed,
  "focusLabel" | "gapTitle" | "gapSummary" | "guidanceTitle" | "guidance" | "placeholder" | "starter" | "minimumLength"
> {
  return {
    focusLabel: template.focusLabel,
    gapTitle: template.gapTitle,
    gapSummary: template.gapSummary,
    guidanceTitle: template.guidanceTitle,
    guidance: template.guidance,
    placeholder: template.placeholder,
    starter: template.starter,
    minimumLength: template.minimumLength,
  };
}

function buildSeedTemplate(subjectId: SecondExamSubjectId): AdminRewriteSeedTemplate {
  const diagnosis = diagnoseSecondExamAnswer({ subjectId });
  const seed = diagnosis.rewriteSeed;
  const now = new Date("2026-04-22T00:00:00.000Z").toISOString();

  return {
    id: buildRewriteSeedTemplateId(subjectId, diagnosis.selectedGap.type),
    subjectId,
    gapType: diagnosis.selectedGap.type,
    focusLabel: seed.focusLabel,
    gapTitle: diagnosis.selectedGap.title,
    gapSummary: diagnosis.selectedGap.summary,
    rewriteInstruction: diagnosis.selectedGap.rewriteInstruction,
    guidanceTitle: seed.guidanceTitle,
    guidance: seed.guidance,
    placeholder: seed.placeholder,
    starter: seed.starter,
    minimumLength: seed.minimumLength,
    active: true,
    operatorNote: "Seeded from the current rule-based second-exam diagnosis result.",
    createdAt: now,
    updatedAt: now,
  };
}

export function getSeedRewriteSeedTemplates() {
  return SECOND_EXAM_ADMIN_SUBJECTS.map((subject) => buildSeedTemplate(subject.id));
}
