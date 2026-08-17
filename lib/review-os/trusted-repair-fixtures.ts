import {
  TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES,
  TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_THEORY_FIXTURE_VERSION,
  TRUSTED_REPAIR_INPUT_MODES,
  type TrustedRepairBank,
  type TrustedRepairFixture,
  type TrustedRepairFixtureKind,
  type TrustedRepairInputMode,
  type TrustedRepairRightsClass,
  type TrustedRepairAnchor,
  type TrustedRepairPracticeAnchor,
  type TrustedRepairTheoryAnchor,
  type TrustedRepairScarcityEvent,
  type TrustedRepairSubject,
} from "./trusted-repair-contract";

type BaseFixture = Readonly<{
  subject: TrustedRepairSubject;
  slug: string;
  labelKo: string;
  canonicalPrompt: string;
  anchors: readonly TrustedRepairAnchor[];
  scaffoldByAnchor: Readonly<Record<string, string>>;
  guidedSolutionByAnchor: Readonly<Record<string, string>>;
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

const THEORY_ANCHORS = [
  {
    anchorId: "repair-anchor:theory:synthetic-income-approach",
    labelKo: "수익방식의 기대수익-가치 전환 술어",
    weight: 400,
    scopedPredicate: {
      anchorKind: "THEORY_SCOPED_PREDICATE",
      anchorId: "repair-anchor:theory:synthetic-income-approach",
      anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1",
      targetScopeId: "theory-target:synthetic-income-approach",
      acceptedTargetAliases: ["income approach", "synthetic income method"],
      requiredPredicates: ["converts_expected_income_to_value"],
      forbiddenPredicates: ["uses_only_historical_cost"],
      acceptableAlternatives: [
        ["capitalizes_expected_income"],
        ["discounts_expected_cash_flow"],
      ],
      counterexampleScopes: ["theory-target:synthetic-cost-approach"],
      negationPolicy: "EXPLICIT_POLARITY",
      mixedPolarityPolicy: "FAIL_CLOSED",
      anaphoraPolicy: "EXACT_TARGET_RESOLUTION_REQUIRED",
      overflowPolicy: {
        maxClauses: 24,
        maxPredicateOccurrences: 64,
        result: "UNSUPPORTED",
      },
      deterministicValidatorId: "validator:theory-scoped-predicate@1",
    },
  },
] as const satisfies readonly TrustedRepairTheoryAnchor[];

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
    guidedSolutionByAnchor: {
      "repair-anchor:practice:synthetic-net-income":
        "가이드 풀이: 연간 총수익 120,000,000원/년에서 연간 운영비 20,000,000원/년을 순서대로 차감합니다. 따라서 연간 순수익은 100,000,000원/년이고 양수이며 반올림은 없습니다. 이 관계를 자신의 문장으로 다시 설명하세요.",
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
  {
    subject: "appraisal_theory",
    slug: "theory",
    labelKo: "이론 · 수익방식 목표범위 술어",
    canonicalPrompt:
      "Inverge 합성 이론 사례에서 수익방식은 기대수익을 가치로 전환한다. 역사적 원가만을 사용하는 합성 원가방식 반례와 구분하여, 수익방식의 목표 범위와 술어의 극성을 설명하라.",
    anchors: THEORY_ANCHORS,
    scaffoldByAnchor: {
      "repair-anchor:theory:synthetic-income-approach":
        "목표를 수익방식으로 고정하고, 기대수익을 가치로 전환한다는 술어를 긍정으로 직접 연결하세요. 역사적 원가만 사용한다는 술어는 수익방식에 적용되지 않음을 구분하세요.",
    },
    guidedSolutionByAnchor: {
      "repair-anchor:theory:synthetic-income-approach":
        "가이드: 수익방식은 기대수익을 가치로 전환합니다. 역사적 원가만을 사용한다는 술어는 별도의 합성 원가방식 반례이며 수익방식의 근거가 아닙니다. 목표 범위와 각 술어의 긍정·부정을 자신의 문장으로 다시 구분하세요.",
    },
    successCriterionKo:
      "수익방식 목표 범위에서 기대수익을 가치로 전환한다는 필수 술어를 긍정하고, 역사적 원가만 사용한다는 금지 술어를 긍정하지 않은 닫힌 범위 증명을 같은 세션에서 구성한다.",
    sourceBinding: {
      sourceType: "synthetic",
      sourceId: "inverge-synthetic-theory-income-approach-v1",
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
  const stage = base.subject === "appraisal_practical" ? "c2r-c-p" : "c2r-c-t";
  const fixtureVersion =
    base.subject === "appraisal_practical"
      ? TRUSTED_REPAIR_FIXTURE_VERSION
      : TRUSTED_REPAIR_THEORY_FIXTURE_VERSION;
  return {
    manifestId: `rights-manifest:${stage}:${base.slug}:${kind}`,
    manifestVersionId: `rights-manifest:${stage}:${base.slug}:${kind}@1`,
    sourceClass: "INVERGE_ORIGINAL",
    rightsHolder: "Inverge",
    permittedPurposes: ["OWNER_TEST_ONLY"],
    territory: ["KR"],
    validFrom: "2026-08-17T00:00:00.000+09:00",
    validUntil: "2036-08-17T00:00:00.000+09:00",
    status: "ACTIVE",
    provenance: [
      `owner-${stage}-stage-authorization-2026-08-17`,
      fixtureVersion,
      `${base.slug}-${kind}`,
    ],
  } as const;
}

function sourceDecision(base: BaseFixture, kind: TrustedRepairFixtureKind) {
  const manifest = rightsManifest(base, kind);
  const stage = base.subject === "appraisal_practical" ? "c2r-c-p" : "c2r-c-t";
  return {
    decisionId: `source-decision:${stage}:${base.slug}:${kind}`,
    sourceClass: manifest.sourceClass,
    purpose: "OWNER_TEST_ONLY",
    decision: "CONDITIONALLY_ELIGIBLE",
    denialCodes: [],
    decidedAt: "2026-08-17T00:00:00.000+09:00",
    policyVersion: "dabangil.c2r_a.rights_safe_adaptive_variant_foundry.v1",
    decisionBasisChecksum: `sha256:synthetic-${base.slug}-${kind}-${stage}-v1`,
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
      guidedSolutionByAnchor: base.guidedSolutionByAnchor,
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

export function trustedRepairScaffoldText(input: {
  fixture: TrustedRepairFixture;
  anchorId: string;
  scaffoldKind: "smallest_eligible_scaffold" | "guided_solution";
}) {
  return input.scaffoldKind === "guided_solution"
    ? input.fixture.guidedSolutionByAnchor[input.anchorId]
    : input.fixture.scaffoldByAnchor[input.anchorId];
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

export function validateTrustedRepairTheoryAnchor(
  anchor: TrustedRepairTheoryAnchor,
) {
  const reasons: string[] = [];
  if (anchor.anchorId !== anchor.scopedPredicate.anchorId) {
    reasons.push("scoped_predicate_anchor_id_mismatch");
  }
  if (anchor.scopedPredicate.anchorKind !== "THEORY_SCOPED_PREDICATE") {
    reasons.push("scoped_predicate_kind_invalid");
  }
  return { valid: reasons.length === 0, reasons } as const;
}

export function validateTrustedRepairFixtureEligibility(
  fixture: TrustedRepairFixture,
  evaluatedAt = new Date().toISOString(),
) {
  const manifest = fixture.rights;
  const anchorReasons = fixture.anchors.flatMap((anchor) => {
    const result =
      "calculationRelation" in anchor
        ? validateTrustedRepairPracticeAnchor(anchor)
        : validateTrustedRepairTheoryAnchor(anchor);
    return result.reasons.map((reason) => `${anchor.anchorId}:${reason}`);
  });
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
      anchorReasons.length === 0 &&
      fixture.releaseState === "AUTOMATED_CHECKED",
    reasons: [
      ...(rightsAllowed ? [] : ["rights_class_not_eligible"]),
      ...(rightsDenied ? ["rights_class_denied"] : []),
      ...(exactRightsBinding ? [] : ["exact_rights_manifest_binding_invalid"]),
      ...anchorReasons,
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
  [
    "theory-income-approach-scope",
    "appraisal_theory",
    "수익방식 기대수익-가치 술어",
    "repair-anchor:theory:synthetic-income-approach",
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
        subject === "appraisal_practical"
          ? sampleIndex === 1
            ? "연간 총수익은 120,000,000원/년, 연간 운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년이고 연간 순수익은 100,000,000원/년으로 양의 부호이며 반올림 없음."
            : "총수익 120,000,000원, 운영비 20,000,000원, 순수익 100,000,000원."
          : sampleIndex === 1
            ? "수익방식은 기대수익을 가치로 전환한다. 역사적 원가만 사용한다는 술어는 합성 원가방식 반례에 속한다."
            : "수익방식과 원가방식은 모두 가치를 설명한다.",
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
      rightsManifestId: `rights-manifest:${subject === "appraisal_practical" ? "c2r-c-p" : "c2r-c-t"}:gold:${familyId}:${sampleIndex}`,
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
  if (TRUSTED_REPAIR_FIXTURES.length !== 14) {
    throw new Error("trusted-repair fixture inventory must contain 14 items");
  }
  if (TRUSTED_REPAIR_GOLD_CANDIDATES.length !== 4) {
    throw new Error("trusted-repair Gold inventory must contain 4 candidates");
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
