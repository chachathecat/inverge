import { readFileSync } from "node:fs";
import { join } from "node:path";

export const OFFICIAL_SOURCE_STATUS_VALUES = ["draft", "verified", "needs_update", "deprecated"] as const;

export const OFFICIAL_SOURCE_KIND_VALUES = [
  "qualification_detail",
  "exam_info",
  "public_notice",
  "exam_schedule",
  "past_questions",
  "final_answers",
  "statute_or_regulation",
  "operator",
] as const;

const AUTHORITY_LEVEL_VALUES = ["primary", "secondary"] as const;
const OWNER_VALUES = ["Q-Net", "한국산업인력공단", "국토교통부"] as const;
const ALLOWED_USE_VALUES = ["metadata_only", "link_reference"] as const;
const DISALLOWED_USE_VALUES = [
  "raw_problem_text_copy",
  "copyrighted_question_body_storage",
  "official_score_claim",
  "pass_fail_claim",
] as const;

const FORBIDDEN_FIELD_NAMES = new Set([
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "officialAnswer",
  "modelAnswer",
  "score",
  "scorePrediction",
  "instructorComment",
]);

const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|model\s+answer|합격\s*보장|공식\s*채점|공식\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

type OfficialSourceEntry = Record<string, unknown>;
type VerifiedCurriculumNode = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function includesAll(values: unknown, required: readonly string[]): boolean {
  return Array.isArray(values) && required.every((value) => values.includes(value));
}

function loadRegistrySourceIds(): Set<string> {
  try {
    const registryPath = join(process.cwd(), "reference_corpus/curriculum/appraiser/official_sources.json");
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    return new Set((registry.sources ?? []).map((source: OfficialSourceEntry) => source.id).filter(Boolean));
  } catch {
    return new Set();
  }
}

function collectBoundaryErrors(value: unknown, path = "node"): string[] {
  const errors: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => errors.push(...collectBoundaryErrors(item, `${path}[${index}]`)));
    return errors;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      errors.push(`${path} contains a forbidden official grading, score, pass/fail, model-answer, or guarantee claim`);
    }
    return errors;
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key)) {
      errors.push(`${path}.${key} is a forbidden raw/source/copyright/score/instructor field`);
    }
    errors.push(...collectBoundaryErrors(child, `${path}.${key}`));
  }
  return errors;
}

export function validateOfficialSourceEntry(entry: OfficialSourceEntry): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(entry)) {
    return { valid: false, errors: ["official source entry must be an object"] };
  }

  for (const requiredField of [
    "id",
    "sourceName",
    "sourceUrl",
    "sourceKind",
    "authorityLevel",
    "owner",
    "verifiedFacts",
    "lastCheckedAt",
    "needsManualRecheckBy",
    "allowedUse",
    "disallowedUse",
    "notes",
  ]) {
    if (!(requiredField in entry)) {
      errors.push(`missing required official source field: ${requiredField}`);
    }
  }

  if (typeof entry.id !== "string" || entry.id.length === 0) errors.push("id must be a non-empty string");
  if (typeof entry.sourceName !== "string" || entry.sourceName.length === 0) errors.push("sourceName must be a non-empty string");
  if (typeof entry.sourceUrl !== "string" || !/^https:\/\//.test(entry.sourceUrl)) errors.push("sourceUrl must be an https URL");
  if (!OFFICIAL_SOURCE_KIND_VALUES.includes(entry.sourceKind as (typeof OFFICIAL_SOURCE_KIND_VALUES)[number])) errors.push("sourceKind is not allowed");
  if (!AUTHORITY_LEVEL_VALUES.includes(entry.authorityLevel as (typeof AUTHORITY_LEVEL_VALUES)[number])) errors.push("authorityLevel is not allowed");
  if (!OWNER_VALUES.includes(entry.owner as (typeof OWNER_VALUES)[number])) errors.push("owner is not allowed");
  if (!isRecord(entry.verifiedFacts)) errors.push("verifiedFacts must be an object");
  if (!isDateString(entry.lastCheckedAt)) errors.push("lastCheckedAt must be YYYY-MM-DD");
  if (!isDateString(entry.needsManualRecheckBy)) errors.push("needsManualRecheckBy must be YYYY-MM-DD");
  if (!includesAll(entry.allowedUse, ALLOWED_USE_VALUES)) errors.push("allowedUse must include metadata_only and link_reference");
  if (!includesAll(entry.disallowedUse, DISALLOWED_USE_VALUES)) errors.push("disallowedUse is missing required data-boundary prohibitions");

  return { valid: errors.length === 0, errors };
}

export function validateVerifiedCurriculumNode(node: VerifiedCurriculumNode): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(node)) {
    return { valid: false, errors: ["curriculum node must be an object"] };
  }

  const sourceStatus = node.sourceStatus;
  if (!OFFICIAL_SOURCE_STATUS_VALUES.includes(sourceStatus as (typeof OFFICIAL_SOURCE_STATUS_VALUES)[number])) {
    errors.push("sourceStatus must be one of draft, verified, needs_update, deprecated");
  }

  errors.push(...collectBoundaryErrors(node));

  if (sourceStatus === "draft" && node.needsOfficialVerification !== true) {
    errors.push("draft node must have needsOfficialVerification: true");
  }

  if (sourceStatus === "verified") {
    for (const requiredField of [
      "officialSourceId",
      "officialSourceUrl",
      "officialSourceName",
      "officialSourceKind",
      "lastOfficialVerifiedAt",
      "verifiedBy",
    ]) {
      if (!(requiredField in node)) {
        errors.push(`verified node is missing ${requiredField}`);
      }
    }
    if (node.needsOfficialVerification !== false) {
      errors.push("verified node must have needsOfficialVerification: false");
    }
    if (!OFFICIAL_SOURCE_KIND_VALUES.includes(node.officialSourceKind as (typeof OFFICIAL_SOURCE_KIND_VALUES)[number])) {
      errors.push("verified node has unknown officialSourceKind");
    }
    if (!isDateString(node.lastOfficialVerifiedAt)) {
      errors.push("verified node lastOfficialVerifiedAt must be YYYY-MM-DD");
    }
    if (typeof node.officialSourceUrl !== "string" || !/^https:\/\//.test(node.officialSourceUrl)) {
      errors.push("verified node officialSourceUrl must be an https URL");
    }
    if (typeof node.officialSourceId !== "string" || !loadRegistrySourceIds().has(node.officialSourceId)) {
      errors.push("verified node officialSourceId is not present in official_sources.json");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertNoUnverifiedProductionNode(nodes: VerifiedCurriculumNode[]): void {
  const unsafe = nodes.filter((node) => node.productionFacing === true && node.sourceStatus !== "verified" && node.draftSafeForClosedBeta !== true);
  if (unsafe.length > 0) {
    throw new Error(`production-facing nodes must be verified or explicitly draft-safe: ${unsafe.map((node) => node.id ?? "unknown").join(", ")}`);
  }
}

export function summarizeOfficialVerificationStatus(nodes: VerifiedCurriculumNode[], sources: OfficialSourceEntry[]) {
  const today = new Date().toISOString().slice(0, 10);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const summary = {
    verifiedNodes: 0,
    draftNodes: 0,
    needsUpdateNodes: 0,
    deprecatedNodes: 0,
    unknownSourceIds: [] as string[],
    staleVerifiedNodeIds: [] as string[],
    status: "current" as "current" | "needs_update",
  };

  for (const node of nodes) {
    if (node.sourceStatus === "verified") summary.verifiedNodes += 1;
    if (node.sourceStatus === "draft") summary.draftNodes += 1;
    if (node.sourceStatus === "needs_update") summary.needsUpdateNodes += 1;
    if (node.sourceStatus === "deprecated") summary.deprecatedNodes += 1;

    if (node.sourceStatus === "verified") {
      const source = typeof node.officialSourceId === "string" ? sourceById.get(node.officialSourceId) : undefined;
      if (!source) {
        summary.unknownSourceIds.push(String(node.officialSourceId ?? "missing"));
        summary.status = "needs_update";
      } else if (typeof source.needsManualRecheckBy === "string" && source.needsManualRecheckBy < today) {
        summary.needsUpdateNodes += 1;
        summary.staleVerifiedNodeIds.push(String(node.id ?? node.officialSourceId));
        summary.status = "needs_update";
      }
    }
  }

  return summary;
}
