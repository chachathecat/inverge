export const TRUST_PROVENANCE_STATES = [
  "confirmed_record",
  "needs_review",
  "conflict",
  "offline",
  "unavailable",
] as const;

export type TrustProvenanceState = (typeof TRUST_PROVENANCE_STATES)[number];

export const TRUST_PROVENANCE_SOURCE_KINDS = [
  "learner_text",
  "ocr_draft",
  "manual_entry",
  "imported_text",
  "reference",
  "ai_draft",
  "persisted_record",
  "none",
] as const;

export type TrustProvenanceSourceKind =
  (typeof TRUST_PROVENANCE_SOURCE_KINDS)[number];

export type TrustProvenanceEvidence =
  | { kind: "learner_confirmation"; learnerConfirmed: true }
  | { kind: "verified_record"; recordVerified: true }
  | { kind: "review_requirement"; reviewRequired: true }
  | { kind: "conflict_record"; conflictRecorded: true }
  | { kind: "offline_state"; offline: true }
  | { kind: "unavailable"; evidenceAvailable: false };

export type TrustProvenanceTone = "green" | "amber" | "red" | "neutral";

export const TRUST_EVIDENCE_BAR_STATES = [
  "Verified",
  "NeedsReview",
  "Conflict",
] as const;

export type TrustEvidenceBarState = (typeof TRUST_EVIDENCE_BAR_STATES)[number];

export const TRUST_EVIDENCE_BAR_DISCLOSURES = [
  "Collapsed",
  "Expanded",
] as const;

export type TrustEvidenceBarDisclosure =
  (typeof TRUST_EVIDENCE_BAR_DISCLOSURES)[number];

export type TrustProvenanceModel = Readonly<{
  state: TrustProvenanceState;
  evidenceKind: TrustProvenanceEvidence["kind"];
  sourceKinds: readonly TrustProvenanceSourceKind[];
  sourceLabel: string;
  statusLabel: string;
  tone: TrustProvenanceTone;
  actionableChange: boolean;
  authorityBoundary: typeof TRUST_AUTHORITY_BOUNDARY;
}>;

/**
 * Read-only Figma V3 presentation adapter. Only evidence-backed trust states
 * enter the three-state component contract. Offline or unavailable evidence
 * stays neutral instead of being promoted to NeedsReview or Verified.
 */
export function resolveTrustEvidenceBarState(
  model: TrustProvenanceModel,
): TrustEvidenceBarState | null {
  switch (model.state) {
    case "confirmed_record":
      return "Verified";
    case "needs_review":
      return "NeedsReview";
    case "conflict":
      return "Conflict";
    case "offline":
    case "unavailable":
      return null;
  }
}

export type LegacyTrustSignals = Readonly<{
  learnerConfirmed?: boolean;
  recordVerified?: boolean;
  reviewRequired?: boolean;
  conflictRecorded?: boolean;
  offline?: boolean;
  evidenceAvailable?: boolean;
}>;

const ALLOWED_EVIDENCE_KEYS: Record<TrustProvenanceEvidence["kind"], readonly string[]> = {
  learner_confirmation: ["kind", "learnerConfirmed"],
  verified_record: ["kind", "recordVerified"],
  review_requirement: ["kind", "reviewRequired"],
  conflict_record: ["kind", "conflictRecorded"],
  offline_state: ["kind", "offline"],
  unavailable: ["kind", "evidenceAvailable"],
};

const TRUST_PROVENANCE_SOURCE_LABELS: Record<TrustProvenanceSourceKind, string> = {
  learner_text: "사용자 텍스트",
  ocr_draft: "OCR 초안",
  manual_entry: "수동 입력",
  imported_text: "가져온 텍스트",
  reference: "참고용 근거",
  ai_draft: "AI 분석 초안",
  persisted_record: "저장된 학습 기록",
  none: "출처 없음",
};

export const TRUST_AUTHORITY_BOUNDARY = Object.freeze({
  learningSupportOnly: true,
  officialGradingAllowed: false,
  confirmedScoreAllowed: false,
  passProbabilityAllowed: false,
  modelAnswerAuthorityAllowed: false,
  deviceVerificationAllowed: false,
} as const);

function trustContractError(message: string): Error {
  return new Error(`s231b-trust-provenance:${message}`);
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw trustContractError("evidence-must-be-a-plain-object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw trustContractError("evidence-must-have-a-plain-prototype");
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  kind: TrustProvenanceEvidence["kind"],
) {
  const allowed = new Set(ALLOWED_EVIDENCE_KEYS[kind]);
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw trustContractError(`unsupported-evidence-fields:${unsupported.sort().join(",")}`);
  }
}

function assertLiteral(
  value: Record<string, unknown>,
  key: string,
  expected: true | false,
) {
  if (!Object.hasOwn(value, key) || value[key] !== expected) {
    throw trustContractError(`${key}-must-be-${String(expected)}`);
  }
}

/**
 * Runtime boundary for trust evidence. Only explicit, typed metadata is accepted.
 * Free-form prose, missing values, scores, grading authority and device claims are
 * deliberately outside this contract, so they cannot silently become a trust state.
 */
export function parseTrustProvenanceEvidence(value: unknown): TrustProvenanceEvidence {
  assertPlainObject(value);
  const kind = value.kind;
  if (
    !Object.hasOwn(value, "kind") ||
    typeof kind !== "string" ||
    !Object.hasOwn(ALLOWED_EVIDENCE_KEYS, kind)
  ) {
    throw trustContractError("unsupported-evidence-kind");
  }

  const evidenceKind = kind as TrustProvenanceEvidence["kind"];
  assertExactKeys(value, evidenceKind);

  switch (evidenceKind) {
    case "learner_confirmation":
      assertLiteral(value, "learnerConfirmed", true);
      return { kind: evidenceKind, learnerConfirmed: true };
    case "verified_record":
      assertLiteral(value, "recordVerified", true);
      return { kind: evidenceKind, recordVerified: true };
    case "review_requirement":
      assertLiteral(value, "reviewRequired", true);
      return { kind: evidenceKind, reviewRequired: true };
    case "conflict_record":
      assertLiteral(value, "conflictRecorded", true);
      return { kind: evidenceKind, conflictRecorded: true };
    case "offline_state":
      assertLiteral(value, "offline", true);
      return { kind: evidenceKind, offline: true };
    case "unavailable":
      assertLiteral(value, "evidenceAvailable", false);
      return { kind: evidenceKind, evidenceAvailable: false };
  }
}

export function parseTrustProvenanceSources(value: unknown): readonly TrustProvenanceSourceKind[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw trustContractError("sources-must-be-a-non-empty-array");
  }

  const allowed = new Set<string>(TRUST_PROVENANCE_SOURCE_KINDS);
  const sources = value.map((candidate) => {
    if (typeof candidate !== "string" || !allowed.has(candidate)) {
      throw trustContractError("unsupported-source-kind");
    }
    return candidate as TrustProvenanceSourceKind;
  });
  const uniqueSources = [...new Set(sources)];
  if (uniqueSources.includes("none") && uniqueSources.length > 1) {
    throw trustContractError("none-source-cannot-be-combined");
  }
  return Object.freeze(uniqueSources);
}

export function buildTrustProvenanceModel(
  value: unknown,
  sourceValue: unknown,
): TrustProvenanceModel {
  const evidence = parseTrustProvenanceEvidence(value);
  const sourceKinds = parseTrustProvenanceSources(sourceValue);
  const provenance = {
    sourceKinds,
    sourceLabel: sourceKinds.map((source) => TRUST_PROVENANCE_SOURCE_LABELS[source]).join(" · "),
    authorityBoundary: TRUST_AUTHORITY_BOUNDARY,
  } as const;

  switch (evidence.kind) {
    case "learner_confirmation":
    case "verified_record":
      return Object.freeze({
        state: "confirmed_record",
        evidenceKind: evidence.kind,
        ...provenance,
        statusLabel: "확인 기록 있음",
        tone: "green",
        actionableChange: false,
      });
    case "review_requirement":
      return Object.freeze({
        state: "needs_review",
        evidenceKind: evidence.kind,
        ...provenance,
        statusLabel: "확인 필요",
        tone: "amber",
        actionableChange: false,
      });
    case "conflict_record":
      return Object.freeze({
        state: "conflict",
        evidenceKind: evidence.kind,
        ...provenance,
        statusLabel: "근거 차이 확인",
        tone: "red",
        actionableChange: true,
      });
    case "offline_state":
      return Object.freeze({
        state: "offline",
        evidenceKind: evidence.kind,
        ...provenance,
        statusLabel: "오프라인 상태",
        tone: "amber",
        actionableChange: true,
      });
    case "unavailable":
      return Object.freeze({
        state: "unavailable",
        evidenceKind: evidence.kind,
        ...provenance,
        statusLabel: "근거 확인 불가",
        tone: "neutral",
        actionableChange: false,
      });
  }
}

/**
 * Backward-compatible adapter for existing boolean props. Every transition is
 * driven by an explicit signal; absence falls closed to `unavailable`.
 */
export function adaptLegacyTrustSignals(signals: LegacyTrustSignals): TrustProvenanceEvidence {
  if (signals.offline === true) return { kind: "offline_state", offline: true };
  if (signals.conflictRecorded === true) return { kind: "conflict_record", conflictRecorded: true };
  if (signals.evidenceAvailable === false) return { kind: "unavailable", evidenceAvailable: false };
  if (signals.reviewRequired === true) return { kind: "review_requirement", reviewRequired: true };
  if (signals.learnerConfirmed === true) return { kind: "learner_confirmation", learnerConfirmed: true };
  if (signals.recordVerified === true) return { kind: "verified_record", recordVerified: true };
  return { kind: "unavailable", evidenceAvailable: false };
}

export const TRUST_PROVENANCE_FIXTURES: ReadonlyArray<TrustProvenanceEvidence> = [
  { kind: "learner_confirmation", learnerConfirmed: true },
  { kind: "review_requirement", reviewRequired: true },
  { kind: "conflict_record", conflictRecorded: true },
  { kind: "offline_state", offline: true },
  { kind: "unavailable", evidenceAvailable: false },
];
