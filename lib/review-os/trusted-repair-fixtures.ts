import {
  TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES,
  TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_INPUT_MODES,
  type TrustedRepairBank,
  type TrustedRepairFixture,
  type TrustedRepairFixtureKind,
  type TrustedRepairInputMode,
  type TrustedRepairRightsClass,
  type TrustedRepairPracticeAnchor,
  type TrustedRepairScarcityEvent,
  type TrustedRepairSubject,
} from "./trusted-repair-contract";

type BaseFixture = Readonly<{
  subject: TrustedRepairSubject;
  slug: string;
  labelKo: string;
  canonicalPrompt: string;
  anchors: readonly TrustedRepairPracticeAnchor[];
  scaffoldByAnchor: Readonly<Record<string, string>>;
  successCriterionKo: string;
  sourceBinding: TrustedRepairFixture["sourceBinding"];
  expectedOutcome: TrustedRepairFixture["expectedOutcome"];
}>;

const PRACTICE_ANCHORS = [
  {
    anchorId: "repair-anchor:practice:synthetic-net-income",
    labelKo: "총수익에서 운영비를 차감하는 연간 순수익 관계",
    weight: 400,
    calculationRelation: {
      anchorKind: "PRACTICE_CALCULATION_RELATION",
      anchorId: "repair-anchor:practice:synthetic-net-income",
      anchorVersionId: "repair-anchor:practice:synthetic-net-income@1",
      operandRoles: [
        { role: "gross_income", value: 120_000_000, unit: "KRW_PER_YEAR" },
        { role: "operating_expense", value: 20_000_000, unit: "KRW_PER_YEAR" },
      ],
      operator: "SUBTRACT",
      operandOrder: ["gross_income", "operating_expense"],
      result: { value: 100_000_000, unit: "KRW_PER_YEAR" },
      units: "KRW_PER_YEAR",
      sign: "POSITIVE",
      rounding: { mode: "HALF_UP", scale: 0 },
      supportedTransformation: "DIRECT_ORDERED",
      deterministicValidatorId: "validator:practice-calculation-relation@1",
    },
  },
] as const satisfies readonly TrustedRepairPracticeAnchor[];

const BASE_FIXTURES = [
  {
    subject: "appraisal_practical",
    slug: "practice",
    labelKo: "실무 · 연간 순수익 차감 관계",
    canonicalPrompt:
      "Inverge 합성 사례의 연간 총수익은 120,000,000원이고 연간 운영비는 20,000,000원이다. 총수익에서 운영비를 차감하는 산식, 결과의 연간 원화 단위, 양의 부호와 반올림 여부를 설명하라.",
    anchors: PRACTICE_ANCHORS,
    scaffoldByAnchor: {
      "repair-anchor:practice:synthetic-net-income":
        "세 칸을 직접 채우세요: 연간 총수익 - 연간 운영비 = 연간 순수익. 숫자, 원/년 단위와 반올림 없음을 함께 적으세요.",
    },
    successCriterionKo:
      "120,000,000 - 20,000,000 = 100,000,000원/년의 순서·연산자·결과·단위·양의 부호·반올림 없음을 하나의 관계로 같은 세션에서 다시 구성한다.",
    sourceBinding: {
      sourceType: "synthetic",
      sourceId: "inverge-synthetic-practice-valuation-v1",
      sourceAnchorId: null,
      requiredStatus: "synthetic_fixture",
    },
    expectedOutcome: "verified",
  },
] as const satisfies readonly BaseFixture[];

const KINDS = [
  "canonical",
  "near_miss",
  "counterexample",
  "flip_condition",
  "sealed_future_variant_a",
  "sealed_future_variant_b",
  "timed_integration",
] as const satisfies readonly TrustedRepairFixtureKind[];

function bankFor(kind: TrustedRepairFixtureKind): TrustedRepairBank {
  if (kind.startsWith("sealed_future")) return "TRANSFER";
  if (kind === "timed_integration") return "MEASUREMENT";
  return "LEARNING";
}

function kindPrompt(base: BaseFixture, kind: TrustedRepairFixtureKind) {
  const suffixes: Record<TrustedRepairFixtureKind, string> = {
    canonical: "기본 조건을 그대로 사용한다.",
    near_miss: "핵심 앵커 하나가 빠진 근접 오답을 찾아 고친다.",
    counterexample: "겉보기 결론이 같아도 근거가 틀린 반례를 구분한다.",
    flip_condition: "조건 하나가 반대로 바뀔 때 결론이 어떻게 달라지는지 밝힌다.",
    sealed_future_variant_a: "표면 표현과 수치를 바꾼 봉인 전이 변형 A이다.",
    sealed_future_variant_b: "사실 배열과 질문 순서를 바꾼 봉인 전이 변형 B이다.",
    timed_integration: "여러 앵커를 제한된 순서로 통합하는 비실행 측정 자산이다.",
  };
  return `${base.canonicalPrompt} ${suffixes[kind]}`;
}

function editableDrafts(
  base: BaseFixture,
  kind: TrustedRepairFixtureKind,
): Record<TrustedRepairInputMode, string> {
  const prompt = kindPrompt(base, kind);
  return {
    TYPED_TEXT: `[직접 입력 · ${kind}] ${prompt}`,
    EDITABLE_PHOTO_OCR: `[합성 사진 OCR 초안 · ${kind}] ${prompt}`,
    EDITABLE_PDF_OCR: `[합성 PDF OCR 초안 · ${kind}] ${prompt}`,
    EDITABLE_VOICE_TRANSCRIPTION: `[합성 음성 전사 초안 · ${kind}] ${prompt}`,
    STRUCTURED_SELECTION: `[구조화 선택 초안 · ${kind}] 과목=${base.labelKo}; 과제=${prompt}`,
  };
}

function rightsManifest(base: BaseFixture, kind: TrustedRepairFixtureKind) {
  return {
    manifestId: `rights-manifest:c2r-c-p:${base.slug}:${kind}`,
    manifestVersionId: `rights-manifest:c2r-c-p:${base.slug}:${kind}@1`,
    sourceClass: "INVERGE_ORIGINAL",
    rightsHolder: "Inverge",
    permittedPurposes: ["OWNER_TEST_ONLY"],
    territory: ["KR"],
    validFrom: "2026-08-17T00:00:00.000+09:00",
    validUntil: "2036-08-17T00:00:00.000+09:00",
    status: "ACTIVE",
    provenance: [
      "owner-c2r-c-p-stage-authorization-2026-08-16",
      TRUSTED_REPAIR_FIXTURE_VERSION,
      `${base.slug}-${kind}`,
    ],
  } as const;
}

function sourceDecision(base: BaseFixture, kind: TrustedRepairFixtureKind) {
  const manifest = rightsManifest(base, kind);
  return {
    decisionId: `source-decision:c2r-c-p:${base.slug}:${kind}`,
    sourceClass: manifest.sourceClass,
    purpose: "OWNER_TEST_ONLY",
    decision: "CONDITIONALLY_ELIGIBLE",
    denialCodes: [],
    decidedAt: "2026-08-17T00:00:00.000+09:00",
    policyVersion: "dabangil.c2r_a.rights_safe_adaptive_variant_foundry.v1",
    decisionBasisChecksum: `sha256:synthetic-${base.slug}-${kind}-c2r-c-p-v1`,
    rightsManifestId: manifest.manifestId,
    rightsManifestVersionId: manifest.manifestVersionId,
    rightsEvaluatedAt: "2026-08-17T00:00:00.000+09:00",
  } as const;
}

export const TRUSTED_REPAIR_FIXTURES: readonly TrustedRepairFixture[] =
  BASE_FIXTURES.flatMap((base) =>
    KINDS.map((kind) => ({
      fixtureId: `wcv-c2-${base.slug}-${kind}`,
      subject: base.subject,
      labelKo: `${base.labelKo} · ${kind}`,
      kind,
      bank: bankFor(kind),
      releaseState: "AUTOMATED_CHECKED" as const,
      runtimeSupported: kind === "canonical",
      expectedOutcome: base.expectedOutcome,
      prompt: kindPrompt(base, kind),
      editableDrafts: editableDrafts(base, kind),
      anchors: base.anchors,
      scaffoldByAnchor: base.scaffoldByAnchor,
      successCriterionKo: base.successCriterionKo,
      sourceBinding: base.sourceBinding,
      rights: rightsManifest(base, kind),
      sourceDecision: sourceDecision(base, kind),
    })),
  );

const FIXTURE_BY_ID = new Map(
  TRUSTED_REPAIR_FIXTURES.map((fixture) => [fixture.fixtureId, fixture]),
);

export function trustedRepairFixtureById(fixtureId: string) {
  return FIXTURE_BY_ID.get(fixtureId) ?? null;
}

export function trustedRepairCanonicalFixture(subject: TrustedRepairSubject) {
  const fixture = TRUSTED_REPAIR_FIXTURES.find(
    (candidate) =>
      candidate.subject === subject && candidate.kind === "canonical",
  );
  if (!fixture) throw new Error(`trusted-repair:missing-canonical:${subject}`);
  return fixture;
}

export function validateTrustedRepairPracticeAnchor(
  anchor: TrustedRepairPracticeAnchor,
) {
  const reasons: string[] = [];
  if (anchor.anchorId !== anchor.calculationRelation.anchorId) {
    reasons.push("calculation_relation_anchor_id_mismatch");
  }
  if (anchor.calculationRelation.anchorKind !== "PRACTICE_CALCULATION_RELATION") {
    reasons.push("calculation_relation_kind_invalid");
  }

  return { valid: reasons.length === 0, reasons } as const;
}

export function validateTrustedRepairFixtureEligibility(
  fixture: TrustedRepairFixture,
  evaluatedAt = new Date().toISOString(),
) {
  const manifest = fixture.rights;
  const practiceAnchorReasons = fixture.anchors.flatMap((anchor) =>
    validateTrustedRepairPracticeAnchor(anchor).reasons.map(
      (reason) => `${anchor.anchorId}:${reason}`,
    ),
  );
  const rightsAllowed = (
    TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES as readonly TrustedRepairRightsClass[]
  ).includes(manifest.sourceClass);
  const rightsDenied = (
    TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES as readonly TrustedRepairRightsClass[]
  ).includes(manifest.sourceClass);
  const decision = fixture.sourceDecision;
  const validFrom = Date.parse(manifest.validFrom);
  const validUntil = Date.parse(manifest.validUntil);
  const rightsEvaluatedAt = Date.parse(decision.rightsEvaluatedAt);
  const currentEvaluationAt = Date.parse(evaluatedAt);
  const manifestWindowValid =
    Number.isFinite(validFrom) &&
    Number.isFinite(validUntil) &&
    Number.isFinite(rightsEvaluatedAt) &&
    Number.isFinite(currentEvaluationAt) &&
    validFrom <= rightsEvaluatedAt &&
    rightsEvaluatedAt <= validUntil &&
    validFrom <= currentEvaluationAt &&
    currentEvaluationAt <= validUntil;
  const exactRightsBinding =
    decision.sourceClass === manifest.sourceClass &&
    decision.rightsManifestId === manifest.manifestId &&
    decision.rightsManifestVersionId === manifest.manifestVersionId &&
    decision.purpose === "OWNER_TEST_ONLY" &&
    manifest.permittedPurposes.includes(decision.purpose) &&
    manifest.territory.includes("KR") &&
    manifest.status === "ACTIVE" &&
    manifestWindowValid;
  return {
    eligible:
      rightsAllowed &&
      !rightsDenied &&
      decision.decision === "CONDITIONALLY_ELIGIBLE" &&
      exactRightsBinding &&
      practiceAnchorReasons.length === 0 &&
      fixture.releaseState === "AUTOMATED_CHECKED",
    reasons: [
      ...(rightsAllowed ? [] : ["rights_class_not_eligible"]),
      ...(rightsDenied ? ["rights_class_denied"] : []),
      ...(exactRightsBinding ? [] : ["exact_rights_manifest_binding_invalid"]),
      ...practiceAnchorReasons,
    ],
  } as const;
}

export type TrustedRepairGoldCandidate = Readonly<{
  candidateId: string;
  familyId: string;
  subject: TrustedRepairSubject;
  sampleIndex: 1 | 2;
  goldTier: "GOLDEN" | "OWNER_GOLD";
  answerSample: string;
  expectedPrimaryGap: string;
  acceptableAlternativeGaps: readonly string[];
  forbiddenFalseGaps: readonly string[];
  exactAnchorIds: readonly string[];
  supportingEvidence: readonly string[];
  counterEvidence: readonly string[];
  repairAction: string;
  successCriterion: string;
  expectedState: "successful" | "unsupported";
  expectedProofEvaluation: "PASS" | "UNSUPPORTED";
  adjudicationState: "OWNER_AUTHORIZED_SYNTHETIC_STAGE_FIXTURE";
  rightsManifestId: string;
}>;

const GOLD_FAMILIES = [
  [
    "practice-net-income-relation",
    "appraisal_practical",
    "연간 순수익 차감 관계",
    "repair-anchor:practice:synthetic-net-income",
  ],
] as const satisfies readonly (readonly [
  string,
  TrustedRepairSubject,
  string,
  string,
])[];

export const TRUSTED_REPAIR_GOLD_CANDIDATES: readonly TrustedRepairGoldCandidate[] =
  GOLD_FAMILIES.flatMap(([familyId, subject, label, anchorId]) =>
    ([1, 2] as const).map((sampleIndex) => ({
      candidateId: `wcv-c2-gold-${familyId}-${sampleIndex}`,
      familyId,
      subject,
      sampleIndex,
      goldTier: sampleIndex === 1 ? ("GOLDEN" as const) : ("OWNER_GOLD" as const),
      answerSample:
        sampleIndex === 1
          ? "연간 총수익은 120,000,000원/년, 연간 운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년이고 연간 순수익은 100,000,000원/년으로 양의 부호이며 반올림 없음."
          : "총수익 120,000,000원, 운영비 20,000,000원, 순수익 100,000,000원.",
      expectedPrimaryGap: `${anchorId}:missing-or-unsupported`,
      acceptableAlternativeGaps: [
        `${anchorId}:partial`,
        `${anchorId}:counter-evidence-unresolved`,
      ],
      forbiddenFalseGaps: [
        "mastery-proven",
        "score-improved",
        "pass-probability",
      ],
      exactAnchorIds: [anchorId],
      supportingEvidence: [`sample-${sampleIndex}:${anchorId}:support`],
      counterEvidence: [`sample-${sampleIndex}:${anchorId}:counter`],
      repairAction: `${label} 앵커를 근거와 함께 한 문장으로 다시 구성한다.`,
      successCriterion: `${label} 앵커와 반대 근거를 같은 세션에서 정확히 구분한다.`,
      expectedState:
        sampleIndex === 1 ? ("successful" as const) : ("unsupported" as const),
      expectedProofEvaluation:
        sampleIndex === 1 ? ("PASS" as const) : ("UNSUPPORTED" as const),
      adjudicationState: "OWNER_AUTHORIZED_SYNTHETIC_STAGE_FIXTURE" as const,
      rightsManifestId: `rights-manifest:c2r-c-p:gold:${familyId}:${sampleIndex}`,
    })),
  );

export const TRUSTED_REPAIR_BODYLESS_SCARCITY_EVENT_KEYS = [
  "eventId",
  "subject",
  "bank",
  "reasonCode",
  "occurredAt",
  "containsBody",
] as const;

export function trustedRepairBankFirstSelection(input: {
  subject: TrustedRepairSubject;
  bank: TrustedRepairBank;
  evaluatedAt?: string;
}) {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const selected = TRUSTED_REPAIR_FIXTURES.find(
    (fixture) =>
      fixture.subject === input.subject &&
      fixture.bank === input.bank &&
      fixture.runtimeSupported &&
      validateTrustedRepairFixtureEligibility(fixture, evaluatedAt).eligible,
  );
  if (selected) return { kind: "selected" as const, fixture: selected };
  const event: TrustedRepairScarcityEvent = {
    eventId: crypto.randomUUID(),
    subject: input.subject,
    bank: input.bank,
    reasonCode: "eligible_bank_gap",
    occurredAt: evaluatedAt,
    containsBody: false,
  };
  return {
    kind: "scarcity" as const,
    event,
    generationDisposition: "QUARANTINED_AUTOMATED_CHECK_REQUIRED" as const,
    selfPublicationAllowed: false,
    selfPromotionAllowed: false,
  };
}

export function assertTrustedRepairFixtureInventory(
  evaluatedAt = new Date().toISOString(),
) {
  if (TRUSTED_REPAIR_FIXTURES.length !== 7) {
    throw new Error("practice trusted-repair fixture inventory must contain 7 items");
  }
  if (TRUSTED_REPAIR_GOLD_CANDIDATES.length !== 2) {
    throw new Error("practice trusted-repair Gold inventory must contain 2 candidates");
  }
  for (const fixture of TRUSTED_REPAIR_FIXTURES) {
    if (
      Object.keys(fixture.editableDrafts).length !==
        TRUSTED_REPAIR_INPUT_MODES.length ||
      !validateTrustedRepairFixtureEligibility(fixture, evaluatedAt).eligible
    ) {
      throw new Error(`trusted-repair fixture is incomplete: ${fixture.fixtureId}`);
    }
  }
}
