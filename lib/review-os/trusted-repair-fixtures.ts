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
  type TrustedRepairSemanticAnchor,
  type TrustedRepairSubject,
} from "./trusted-repair-contract";

type BaseFixture = Readonly<{
  subject: TrustedRepairSubject;
  slug: string;
  labelKo: string;
  canonicalPrompt: string;
  anchors: readonly TrustedRepairSemanticAnchor[];
  scaffoldByAnchor: Readonly<Record<string, string>>;
  successCriterionKo: string;
  sourceBinding: TrustedRepairFixture["sourceBinding"];
  expectedOutcome: TrustedRepairFixture["expectedOutcome"];
}>;

const PRACTICE_ANCHORS = [
  {
    anchorId: "practice-input-role",
    labelKo: "면적과 단가의 역할",
    requiredConcepts: ["면적", "단가"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["면적"], alternatives: ["수량"] },
      { requiredConcepts: ["단가"], alternatives: ["단위가격"] },
    ],
    forbiddenFalseClaims: ["단가끼리 곱한다", "면적은 단위가 없다"],
    weight: 300,
  },
  {
    anchorId: "practice-intermediate-calculation",
    labelKo: "중간 산식과 결과",
    requiredConcepts: ["100", "2000000", "200000000"],
    acceptableAlternativeGroups: [
      {
        requiredConcepts: ["200000000"],
        alternatives: ["2억", "100×200만원"],
      },
    ],
    forbiddenFalseClaims: ["20000000", "20억"],
    weight: 240,
  },
  {
    anchorId: "practice-unit-rounding-verification",
    labelKo: "단위·부호·백분율·반올림·검산",
    requiredConcepts: ["m²", "원", "부호", "반올림", "검산"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["m²"], alternatives: ["제곱미터"] },
      { requiredConcepts: ["부호"], alternatives: ["양수"] },
      { requiredConcepts: ["반올림"], alternatives: ["반올림 없음"] },
      { requiredConcepts: ["검산"], alternatives: ["역산"] },
    ],
    forbiddenFalseClaims: ["퍼센트 단위", "음수"],
    weight: 180,
  },
] as const satisfies readonly TrustedRepairSemanticAnchor[];

const THEORY_ANCHORS = [
  {
    anchorId: "theory-exact-definition",
    labelKo: "정확한 정의",
    requiredConcepts: ["최유효이용", "합리적", "가능"],
    acceptableAlternativeGroups: [
      {
        requiredConcepts: ["가능"],
        alternatives: ["법적 가능", "물리적 가능"],
      },
    ],
    forbiddenFalseClaims: ["항상 현재 이용", "가격이 가장 높은 이용만"],
    weight: 300,
  },
  {
    anchorId: "theory-argument-chain",
    labelKo: "논거의 연결",
    requiredConcepts: ["법적", "물리적", "경제적"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["법적"], alternatives: ["허용"] },
      { requiredConcepts: ["물리적"], alternatives: ["실현"] },
      { requiredConcepts: ["경제적"], alternatives: ["수익"] },
    ],
    forbiddenFalseClaims: ["검토 순서가 불필요", "하나의 요건만 충족"],
    weight: 240,
  },
  {
    anchorId: "theory-application-and-counter",
    labelKo: "사례 적용과 반대 고려",
    requiredConcepts: ["사례", "반대", "결론"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["사례"], alternatives: ["적용"] },
      { requiredConcepts: ["반대"], alternatives: ["한계"] },
    ],
    forbiddenFalseClaims: ["정의만 쓰면 적용 완료", "반대 사실은 무시"],
    weight: 180,
  },
] as const satisfies readonly TrustedRepairSemanticAnchor[];

const LAW_ANCHORS = [
  {
    anchorId: "law-source-effective-version",
    labelKo: "공식 출처와 유효 버전",
    requiredConcepts: ["공식", "유효", "버전"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["유효"], alternatives: ["시행"] },
      { requiredConcepts: ["버전"], alternatives: ["기준일"] },
    ],
    forbiddenFalseClaims: ["출처 불명 조문", "현재법 추정"],
    weight: 360,
  },
  {
    anchorId: "law-fact-to-element",
    labelKo: "사실과 요건의 연결",
    requiredConcepts: ["사실", "요건", "포섭"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["사실"], alternatives: ["사안"] },
      { requiredConcepts: ["포섭"], alternatives: ["해당"] },
    ],
    forbiddenFalseClaims: ["요건 없는 결론", "사실 없는 조문 나열"],
    weight: 260,
  },
  {
    anchorId: "law-conflict-withhold",
    labelKo: "출처 충돌 시 보류",
    requiredConcepts: ["충돌", "보류", "검증"],
    acceptableAlternativeGroups: [
      { requiredConcepts: ["충돌"], alternatives: ["불확실"] },
      {
        requiredConcepts: ["보류", "검증"],
        alternatives: ["확인 필요"],
      },
    ],
    forbiddenFalseClaims: ["충돌해도 확정", "근거 없이 현행"],
    weight: 220,
  },
] as const satisfies readonly TrustedRepairSemanticAnchor[];

const BASE_FIXTURES = [
  {
    subject: "appraisal_practical",
    slug: "practice",
    labelKo: "실무 · 면적과 단가 검산",
    canonicalPrompt:
      "합성 대상 토지 100m²의 적용 단가가 2,000,000원/m²이다. 면적과 단가의 역할, 중간 산식, 단위·부호·백분율 여부·반올림과 검산을 포함해 가액을 설명하라.",
    anchors: PRACTICE_ANCHORS,
    scaffoldByAnchor: {
      "practice-input-role": "먼저 두 숫자 옆에 각각 ‘면적’과 ‘단가’라고 적고, 곱하는 이유를 한 문장으로 말해 보세요.",
      "practice-intermediate-calculation": "산식의 세 칸을 비워 두고 직접 채우세요: 면적 × 단가 = 중간 결과.",
      "practice-unit-rounding-verification": "결과 단위와 부호를 쓰고 백분율 계산이 아님을 확인한 뒤, 반올림 여부와 면적으로 나눈 역산 검산을 적으세요.",
    },
    successCriterionKo:
      "면적×단가의 중간 결과 200,000,000원과 단위·부호·백분율 여부·반올림·역산 검증을 같은 세션에서 다시 구성한다.",
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
    labelKo: "이론 · 최유효이용 논증",
    canonicalPrompt:
      "합성 사례에서 최유효이용을 정의하고, 법적·물리적·경제적 가능성의 논거를 연결한 뒤 반대 사실을 고려해 결론을 제시하라.",
    anchors: THEORY_ANCHORS,
    scaffoldByAnchor: {
      "theory-exact-definition": "‘합리적’과 ‘가능’이라는 두 낱말을 반드시 사용해 정의 한 문장을 다시 써 보세요.",
      "theory-argument-chain": "법적 → 물리적 → 경제적 가능성의 순서로 각 단계가 다음 단계에 왜 필요한지 연결하세요.",
      "theory-application-and-counter": "사례 사실 하나와 반대 사실 하나를 나란히 놓고, 어느 쪽이 결론을 더 지지하는지 적으세요.",
    },
    successCriterionKo:
      "정의·논거·사례 적용·반대 고려를 정확한 의미 앵커에 맞춰 같은 세션에서 재구성한다.",
    sourceBinding: {
      sourceType: "synthetic",
      sourceId: "inverge-synthetic-theory-hbu-v1",
      sourceAnchorId: null,
      requiredStatus: "synthetic_fixture",
    },
    expectedOutcome: "verified",
  },
  {
    subject: "appraisal_compensation_law",
    slug: "law",
    labelKo: "법규 · 요건과 사실 포섭",
    canonicalPrompt:
      "합성 보상사례에서 사실과 법적 요건을 연결해 결론을 제시하되, 공식 출처의 유효 버전이 확인되지 않거나 충돌하면 검증된 결론을 보류하라.",
    anchors: LAW_ANCHORS,
    scaffoldByAnchor: {
      "law-source-effective-version": "법명·기준일·유효 버전의 세 칸 중 확인되지 않은 칸을 ‘확인 필요’로 남기세요.",
      "law-fact-to-element": "사실 하나를 고르고, 그 사실이 어느 요건을 충족하거나 충족하지 않는지 한 문장으로 포섭하세요.",
      "law-conflict-withhold": "서로 다른 근거가 충돌할 때 확정 결론 대신 사용할 보류 문장을 직접 작성하세요.",
    },
    successCriterionKo:
      "공식 출처·유효 버전·사실-요건 포섭을 모두 확인하고, 충돌 시 검증된 결론을 보류한다.",
    sourceBinding: {
      sourceType: "official_registry_metadata",
      sourceId: "law-source-land-compensation-act",
      sourceAnchorId: "law-anchor-land-compensation-act-current-candidate",
      requiredStatus: "current_law_verified",
    },
    expectedOutcome: "blocked",
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
    manifestId: `rights-${base.slug}-${kind}-20260812`,
    rightsClass: "INVERGE_ORIGINAL_SYNTHETIC",
    author: "Inverge",
    copyrightHolder: "Inverge",
    lineage: [
      "owner-instruction-2026-08-12",
      TRUSTED_REPAIR_FIXTURE_VERSION,
      `${base.slug}-${kind}`,
    ],
    synthetic: true,
    learnerPrivate: false,
    thirdPartyBodyUsed: false,
    rawBodyTrainingAllowed: false,
    reconstructionOfDeniedSource: false,
    nearCopyScore: 0,
    sharingAllowed: false,
    purpose: "owner_test_only",
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
      expectedOutcome:
        base.subject === "appraisal_compensation_law"
          ? ("blocked" as const)
          : base.expectedOutcome,
      prompt: kindPrompt(base, kind),
      editableDrafts: editableDrafts(base, kind),
      anchors: base.anchors,
      scaffoldByAnchor: base.scaffoldByAnchor,
      successCriterionKo: base.successCriterionKo,
      sourceBinding: base.sourceBinding,
      rights: rightsManifest(base, kind),
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

function normalizeSemanticTerm(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,._·:;()[\]{}]+/g, "");
}

export function validateTrustedRepairAlternativeGroups(
  anchor: TrustedRepairSemanticAnchor,
) {
  const reasons: string[] = [];
  const requiredConcepts = new Set(anchor.requiredConcepts);
  const seenAlternatives = new Set<string>();

  if (anchor.acceptableAlternativeGroups.length === 0) {
    reasons.push("alternative_groups_empty");
  }
  anchor.acceptableAlternativeGroups.forEach((group, groupIndex) => {
    if (group.requiredConcepts.length === 0) {
      reasons.push(`group_${groupIndex}:required_concepts_empty`);
    }
    for (const concept of group.requiredConcepts) {
      if (!requiredConcepts.has(concept)) {
        reasons.push(`group_${groupIndex}:unknown_required_concept:${concept}`);
      }
    }
    if (group.alternatives.length === 0) {
      reasons.push(`group_${groupIndex}:alternatives_empty`);
    }
    for (const alternative of group.alternatives) {
      const normalized = normalizeSemanticTerm(alternative);
      if (normalized.length === 0) {
        reasons.push(`group_${groupIndex}:alternative_empty`);
        continue;
      }
      if (seenAlternatives.has(normalized)) {
        reasons.push(`group_${groupIndex}:duplicate_alternative:${normalized}`);
      }
      seenAlternatives.add(normalized);
    }
  });

  return { valid: reasons.length === 0, reasons } as const;
}

export function validateTrustedRepairFixtureEligibility(
  fixture: TrustedRepairFixture,
) {
  const manifest = fixture.rights;
  const alternativeGroupReasons = fixture.anchors.flatMap((anchor) =>
    validateTrustedRepairAlternativeGroups(anchor).reasons.map(
      (reason) => `${anchor.anchorId}:${reason}`,
    ),
  );
  const rightsAllowed = (
    TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES as readonly TrustedRepairRightsClass[]
  ).includes(manifest.rightsClass);
  const rightsDenied = (
    TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES as readonly TrustedRepairRightsClass[]
  ).includes(manifest.rightsClass);
  return {
    eligible:
      rightsAllowed &&
      !rightsDenied &&
      manifest.synthetic === true &&
      manifest.learnerPrivate === false &&
      manifest.thirdPartyBodyUsed === false &&
      manifest.rawBodyTrainingAllowed === false &&
      manifest.reconstructionOfDeniedSource === false &&
      manifest.nearCopyScore === 0 &&
      manifest.sharingAllowed === false &&
      alternativeGroupReasons.length === 0 &&
      fixture.releaseState === "AUTOMATED_CHECKED",
    reasons: [
      ...(rightsAllowed ? [] : ["rights_class_not_eligible"]),
      ...(rightsDenied ? ["rights_class_denied"] : []),
      ...(manifest.thirdPartyBodyUsed ? ["third_party_body"] : []),
      ...(manifest.rawBodyTrainingAllowed ? ["raw_body_training"] : []),
      ...(manifest.reconstructionOfDeniedSource ? ["reconstruction_risk"] : []),
      ...(manifest.nearCopyScore !== 0 ? ["near_copy_risk"] : []),
      ...alternativeGroupReasons,
    ],
  } as const;
}

export type TrustedRepairGoldCandidate = Readonly<{
  candidateId: string;
  familyId: string;
  subject: TrustedRepairSubject;
  sampleIndex: 1 | 2;
  answerSample: string;
  expectedPrimaryGap: string;
  acceptableAlternativeGaps: readonly string[];
  forbiddenFalseGaps: readonly string[];
  exactAnchorIds: readonly string[];
  supportingEvidence: readonly string[];
  counterEvidence: readonly string[];
  repairAction: string;
  successCriterion: string;
  expectedState: "successful" | "blocked" | "uncertain";
  adjudicationState: "REGRESSION_CANDIDATE_NOT_OWNER_REVIEWED";
  rightsManifestId: string;
}>;

const GOLD_FAMILIES = [
  ["practice-input-role", "appraisal_practical", "자료 역할", "practice-input-role"],
  ["practice-unit-check", "appraisal_practical", "단위와 검산", "practice-unit-rounding-verification"],
  ["practice-intermediate", "appraisal_practical", "중간 산식", "practice-intermediate-calculation"],
  ["theory-definition", "appraisal_theory", "정의", "theory-exact-definition"],
  ["theory-argument", "appraisal_theory", "논거", "theory-argument-chain"],
  ["theory-application", "appraisal_theory", "사례 적용", "theory-application-and-counter"],
  ["law-version", "appraisal_compensation_law", "유효 버전", "law-source-effective-version"],
  ["law-subsumption", "appraisal_compensation_law", "사실 포섭", "law-fact-to-element"],
  ["law-conflict", "appraisal_compensation_law", "출처 충돌", "law-conflict-withhold"],
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
      answerSample: `Inverge 합성 ${label} 답안 표본 ${sampleIndex}: 학습자가 독립 시도에서 ${label} 근거를 서로 다른 문장 구조로 제시한다.`,
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
        subject === "appraisal_compensation_law"
          ? ("blocked" as const)
          : sampleIndex === 1
            ? ("successful" as const)
            : ("uncertain" as const),
      adjudicationState: "REGRESSION_CANDIDATE_NOT_OWNER_REVIEWED" as const,
      rightsManifestId: `rights-gold-${familyId}-${sampleIndex}-20260812`,
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
}) {
  const selected = TRUSTED_REPAIR_FIXTURES.find(
    (fixture) =>
      fixture.subject === input.subject &&
      fixture.bank === input.bank &&
      fixture.runtimeSupported &&
      validateTrustedRepairFixtureEligibility(fixture).eligible,
  );
  if (selected) return { kind: "selected" as const, fixture: selected };
  return {
    kind: "scarcity" as const,
    event: {
      eventId: `scarcity-${input.subject}-${input.bank}`,
      subject: input.subject,
      bank: input.bank,
      reasonCode: "eligible_bank_gap",
      occurredAt: "2026-08-12T00:00:00.000Z",
      containsBody: false,
    },
    generationDisposition: "QUARANTINED_AUTOMATED_CHECK_REQUIRED" as const,
    selfPublicationAllowed: false,
    selfPromotionAllowed: false,
  };
}

export function assertTrustedRepairFixtureInventory() {
  if (TRUSTED_REPAIR_FIXTURES.length !== 21) {
    throw new Error("trusted-repair fixture inventory must contain 21 items");
  }
  if (TRUSTED_REPAIR_GOLD_CANDIDATES.length !== 18) {
    throw new Error("trusted-repair Gold inventory must contain 18 candidates");
  }
  for (const fixture of TRUSTED_REPAIR_FIXTURES) {
    if (
      Object.keys(fixture.editableDrafts).length !==
        TRUSTED_REPAIR_INPUT_MODES.length ||
      !validateTrustedRepairFixtureEligibility(fixture).eligible
    ) {
      throw new Error(`trusted-repair fixture is incomplete: ${fixture.fixtureId}`);
    }
  }
}
