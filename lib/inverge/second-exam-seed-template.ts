import type { AdminRewriteSeedTemplate } from "@/lib/inverge/admin-rewrite-seed-templates";
import type {
  CandidateGap,
  GapType,
  SecondExamDiagnosisResult,
  SecondExamRewriteSeed,
  SecondExamSubjectId,
} from "@/lib/inverge/second-exam-diagnosis";

export type SecondExamSeedTemplateOverride = Pick<
  AdminRewriteSeedTemplate,
  | "id"
  | "subjectId"
  | "gapType"
  | "focusLabel"
  | "gapTitle"
  | "gapSummary"
  | "rewriteInstruction"
  | "guidanceTitle"
  | "guidance"
  | "placeholder"
  | "starter"
  | "minimumLength"
  | "active"
>;

export function toSecondExamSeedTemplateOverride(
  template: AdminRewriteSeedTemplate,
): SecondExamSeedTemplateOverride {
  return {
    id: template.id,
    subjectId: template.subjectId,
    gapType: template.gapType,
    focusLabel: template.focusLabel,
    gapTitle: template.gapTitle,
    gapSummary: template.gapSummary,
    rewriteInstruction: template.rewriteInstruction,
    guidanceTitle: template.guidanceTitle,
    guidance: template.guidance,
    placeholder: template.placeholder,
    starter: template.starter,
    minimumLength: template.minimumLength,
    active: template.active,
  };
}

export function applySeedTemplateToGap(
  gap: CandidateGap,
  template?: SecondExamSeedTemplateOverride | null,
): CandidateGap {
  if (!template || !template.active) return gap;

  return {
    ...gap,
    focusLabel: template.focusLabel,
    title: template.gapTitle,
    summary: template.gapSummary,
    rewriteInstruction: template.rewriteInstruction,
  };
}

export function applySeedTemplateToRewriteSeed(
  seed: SecondExamRewriteSeed,
  template?: SecondExamSeedTemplateOverride | null,
): SecondExamRewriteSeed {
  if (!template || !template.active) return seed;

  return {
    ...seed,
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

export function applySeedTemplateToDiagnosis(
  diagnosis: SecondExamDiagnosisResult,
  template?: SecondExamSeedTemplateOverride | null,
): SecondExamDiagnosisResult {
  if (!template || !template.active) return diagnosis;

  const selectedGap = applySeedTemplateToGap(diagnosis.selectedGap, template);
  const rewriteSeed = applySeedTemplateToRewriteSeed(diagnosis.rewriteSeed, template);

  return {
    ...diagnosis,
    selectedGap,
    rewriteSeed,
    recordsSummarySeed: {
      ...diagnosis.recordsSummarySeed,
      focusLabel: template.focusLabel,
      gapTitle: template.gapTitle,
    },
  };
}

export type SecondExamSeedTemplateLookupInput = {
  subjectId: SecondExamSubjectId;
  gapType: GapType;
  focusLabel?: string;
};
