import type { SubjectId } from "@/lib/appraisal-first/types";

const SUBJECT_ID_ALIASES: Record<string, SubjectId> = {
  civil_law: "civil_law",
  "civil-law": "civil_law",
  economics: "economics",
  real_estate: "real_estate",
  "real-estate": "real_estate",
  appraisal_law: "appraisal_law",
  "appraisal-law": "appraisal_law",
  accounting: "accounting",
};

export function normalizeAppraisalFirstSubjectId(value: string | null | undefined): SubjectId {
  if (!value) return "appraisal_law";
  return SUBJECT_ID_ALIASES[value] ?? "appraisal_law";
}

export function parseAppraisalFirstSubjectId(value: string | null | undefined): SubjectId | undefined {
  if (!value) return undefined;
  return SUBJECT_ID_ALIASES[value];
}
