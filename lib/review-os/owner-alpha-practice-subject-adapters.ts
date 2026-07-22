import type {
  OwnerAlphaClaimState,
  OwnerAlphaPracticeProblemModel,
} from "./owner-alpha-practice-contract";
import {
  OWNER_ALPHA_LAW_GAP_TYPES,
  OWNER_ALPHA_LAW_REWRITE_MODES,
  OWNER_ALPHA_PRACTICAL_GAP_TYPES,
  OWNER_ALPHA_PRACTICAL_REWRITE_MODES,
  OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
  OWNER_ALPHA_THEORY_GAP_TYPES,
  OWNER_ALPHA_THEORY_REWRITE_MODES,
  isOwnerAlphaPracticeSubject,
  ownerAlphaSubjectLabel,
  type OwnerAlphaAnswerPlan,
  type OwnerAlphaLawAdapterModel,
  type OwnerAlphaPracticeSubject,
  type OwnerAlphaPracticalAdapterModel,
  type OwnerAlphaSubjectAdapterModel,
  type OwnerAlphaSubjectDomainTag,
  type OwnerAlphaSubjectRouting,
  type OwnerAlphaTheoryAdapterModel,
} from "./owner-alpha-subject-adapter-contract";

type AdapterCompileInput = {
  problemText: string;
  routing: OwnerAlphaSubjectRouting;
  model: Omit<OwnerAlphaPracticeProblemModel, "subjectAdapter">;
};

export type OwnerAlphaSubjectAdapterPort<
  T extends OwnerAlphaSubjectAdapterModel = OwnerAlphaSubjectAdapterModel,
> = {
  readonly subject: T["subject"];
  readonly name: T["adapter"];
  compile(input: AdapterCompileInput): T;
};

function compact(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()))]
    .filter(Boolean)
    .slice(0, limit);
}

function sentences(text: string) {
  return compact(
    text.split(/(?:\n+|(?<=[.!?])\s+)/).map((value) => value.trim()),
    40,
  );
}

function matchingSentences(text: string, pattern: RegExp, limit = 8) {
  return sentences(text).filter((value) => pattern.test(value)).slice(0, limit);
}

function answerPlan(
  roles: readonly string[],
  points: OwnerAlphaPracticeProblemModel["pointAllocation"],
  validationMode: OwnerAlphaAnswerPlan["validationMode"],
): OwnerAlphaAnswerPlan {
  return {
    hierarchy: roles.map((role, index) => ({
      planId: `answer-plan-${index + 1}`,
      parentPlanId: null,
      label: role,
      role,
      pointWeight: points[index]?.points ?? null,
    })),
    validationMode,
  };
}

function requestedSubjectOrNull(value: unknown) {
  return isOwnerAlphaPracticeSubject(value) ? value : null;
}

export function routeOwnerAlphaPracticeSubject(input: {
  problemText: string;
  requestedSubject?: OwnerAlphaPracticeSubject | null;
}): OwnerAlphaSubjectRouting {
  const text = input.problemText.normalize("NFKC");
  const calculation =
    /(산정|계산|가격|가액|보상액|면적|단가|비율|환원|할인|감가|배분|보정|원가|비교방식|수익방식)/i.test(
      text,
    );
  const law =
    /(법률|법령|시행령|시행규칙|제\s*\d+\s*조|조문|요건|포섭|절차|처분|판례|재결|사업인정|수용)/i.test(
      text,
    );
  const theory =
    /(이론|의의|정의|개념|본질|원칙|정당보상|가치론|비교하여\s*논|평가하여\s*논|견해|논거)/i.test(
      text,
    );
  const requested = requestedSubjectOrNull(input.requestedSubject);
  const primarySubject = requested ?? (law ? "appraisal_compensation_law" : theory ? "appraisal_theory" : "appraisal_practical");
  const secondaryDomains: OwnerAlphaPracticeSubject[] = [];
  if (calculation && primarySubject !== "appraisal_practical") {
    secondaryDomains.push("appraisal_practical");
  }
  if (theory && primarySubject !== "appraisal_theory") {
    secondaryDomains.push("appraisal_theory");
  }
  if (law && primarySubject !== "appraisal_compensation_law") {
    secondaryDomains.push("appraisal_compensation_law");
  }

  const domainTags: OwnerAlphaSubjectDomainTag[] = [];
  if (calculation) domainTags.push("valuation_calculation");
  if (calculation && /보상|수용|공익사업법/i.test(text)) {
    domainTags.push("compensation_valuation");
  }
  if (law) domainTags.push("compensation_statute", "legal_requirements");
  if (/절차|재결|사업인정|수용/i.test(text)) {
    domainTags.push("compensation_procedure");
  }
  if (/판례|재결례|결정례/i.test(text)) domainTags.push("precedent_application");
  if (theory) domainTags.push("value_theory");
  if (/정당보상|보상의\s*본질|완전보상/i.test(text)) {
    domainTags.push("just_compensation_theory");
  }
  if (secondaryDomains.length > 0) domainTags.push("mixed_subject");

  return {
    primarySubject,
    secondaryDomains: compact(secondaryDomains, 2) as OwnerAlphaPracticeSubject[],
    domainTags: compact(domainTags, 9) as OwnerAlphaSubjectDomainTag[],
  };
}

function practicalProblemType(model: AdapterCompileInput["model"]) {
  return model.methodFamily === "mixed_or_uncertain"
    ? "mixed_or_uncertain_appraisal_problem"
    : `${model.methodFamily}_problem`;
}

export const PracticalAdapter: OwnerAlphaSubjectAdapterPort<OwnerAlphaPracticalAdapterModel> = {
  subject: "appraisal_practical",
  name: "PracticalAdapter",
  compile({ routing, model }) {
    return {
      contractVersion: OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
      adapter: "PracticalAdapter",
      subject: "appraisal_practical",
      secondaryDomains: routing.secondaryDomains,
      domainTags: routing.domainTags,
      problemType: practicalProblemType(model),
      answerPlan: answerPlan(
        [
          "전제조건·기준시점·평가목적",
          "자료 선택과 배제 근거",
          "적용 방식·산식",
          "계산 과정",
          "단위·반올림·시점수정",
          "검산",
          "최종 판단·답안 문장",
        ],
        model.pointAllocation,
        "deterministic_calculation_and_structure",
      ),
      gapTypes: OWNER_ALPHA_PRACTICAL_GAP_TYPES,
      rewriteModes: OWNER_ALPHA_PRACTICAL_REWRITE_MODES,
      defaultRewriteMode: "recalculation",
      transferTask: {
        mode: "numeric_variant",
        prompt: "숫자 또는 조건 하나만 바꾼 뒤 같은 산식과 단위를 독립적으로 다시 재현하세요.",
      },
      entitiesAndRoles: model.entitiesAndRoles.map((item) => ({
        entityId: item.entityId,
        label: item.label,
        role: item.role,
      })),
      datesAndValuationTimePoints: model.datesAndTimePoints.map((item) => ({
        timePointId: item.timePointId,
        label: item.label,
        value: item.value,
      })),
      numbersAndUnits: model.givenNumbers.map((item) => ({
        numberId: item.numberId,
        value: item.value,
        unit: item.unit,
      })),
      methodCandidates: model.methodCandidates.map((item) => ({
        methodId: item.methodId,
        label: item.label,
      })),
      methodRejectionReasons: model.rejectionReasons.map((item) => ({
        methodId: item.methodId,
        reason: item.reason,
      })),
      calculationGraphNodeIds: model.calculationGraph.nodes.map(
        (item) => item.nodeId,
      ),
      requestedNumericAndWrittenOutputs: model.requestedOutputs,
      deterministicCalculationChecks: {
        requiredForCriticalCalculations: true,
        failClosedOnConflictOrUnsupported: true,
      },
      recalculationTask:
        "자료 역할·산식·단위·반올림을 보존해 같은 결과를 직접 다시 계산하세요.",
      numericOrConditionVariant:
        model.givenNumbers.length > 0 ? "numeric" : "condition",
    };
  },
};

function pointWeightedDepth(
  points: OwnerAlphaPracticeProblemModel["pointAllocation"],
) {
  return points.map((item) => ({
    requirementId: item.requirementId,
    points: item.points,
    expectedDepth:
      item.points !== null && item.points >= 20
        ? ("deep" as const)
        : item.points !== null && item.points <= 10
          ? ("brief" as const)
          : ("standard" as const),
  }));
}

function theoryConcepts(text: string) {
  const concepts: string[] = [];
  for (const [pattern, label] of [
    [/가치론|가치의\s*본질/i, "가치론"],
    [/최유효이용/i, "최유효이용"],
    [/시장가치/i, "시장가치"],
    [/정당보상|완전보상/i, "정당보상"],
    [/가격다원론|가치다원론/i, "가격다원론"],
    [/비교가능성/i, "비교가능성"],
  ] as const) {
    if (pattern.test(text)) concepts.push(label);
  }
  return compact(concepts, 12);
}

export const TheoryAdapter: OwnerAlphaSubjectAdapterPort<OwnerAlphaTheoryAdapterModel> = {
  subject: "appraisal_theory",
  name: "TheoryAdapter",
  compile({ problemText, routing, model }) {
    const issueCandidates = model.requirements.map((item) => item.text);
    const concepts = theoryConcepts(problemText);
    return {
      contractVersion: OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
      adapter: "TheoryAdapter",
      subject: "appraisal_theory",
      secondaryDomains: routing.secondaryDomains,
      domainTags: routing.domainTags,
      problemType:
        routing.secondaryDomains.length > 0
          ? "mixed_domain_appraisal_theory_essay"
          : "appraisal_theory_essay",
      answerPlan: answerPlan(
        [
          "쟁점·의의",
          "정의·명제",
          "지배 원리·논리적 전제",
          "논증 단계",
          "비교·반대 고려",
          "실무·사례 연결",
          "평가",
          "결론",
        ],
        model.pointAllocation,
        "structure_relationship_coverage_only",
      ),
      gapTypes: OWNER_ALPHA_THEORY_GAP_TYPES,
      rewriteModes: OWNER_ALPHA_THEORY_REWRITE_MODES,
      defaultRewriteMode: "outline_reconstruction",
      transferTask: {
        mode: "blank_recall",
        prompt: "정의·전제·논증·비교·평가·결론을 빈 화면에서 다시 연결하세요.",
      },
      issueCandidates,
      definitionOrProposition: matchingSentences(
        problemText,
        /정의|의의|개념|명제|본질/,
      ),
      governingPrinciples: matchingSentences(
        problemText,
        /원리|원칙|근거|이론|법칙/,
      ),
      logicalPremises: matchingSentences(problemText, /전제|때문|따라서|조건/),
      argumentSteps: matchingSentences(problemText, /논하|설명|검토|평가|비교/),
      comparisonTargets: matchingSentences(problemText, /비교|차이|공통|대비/),
      supportingAndOpposingConsiderations: matchingSentences(
        problemText,
        /반면|다만|찬성|반대|한계|대안|견해/,
      ),
      practicalOrCaseConnection: matchingSentences(
        problemText,
        /실무|사례|적용|감정평가/,
      ),
      evaluation: matchingSentences(problemText, /평가|타당|한계|비판/),
      conclusion: matchingSentences(problemText, /결론|따라서|그러므로/),
      expectedOutlineHierarchy: [
        "쟁점·의의",
        "정의·명제",
        "지배 원리·전제",
        "논증·비교",
        "적용·평가",
        "결론",
      ],
      paragraphRoles: [
        "issue",
        "definition",
        "premise",
        "argument",
        "comparison",
        "application",
        "evaluation",
        "conclusion",
      ],
      pointWeightedDepth: pointWeightedDepth(model.pointAllocation),
      keyConceptCoverage: concepts.map((concept) => ({
        concept,
        state: "problem_given" as const,
      })),
      unresolvedTheoreticalDispute: matchingSentences(
        problemText,
        /견해|논란|대립|반대|쟁점/,
      ),
      validationPolicy: {
        deterministicScoringAllowed: false,
        verifies: [
          "structure",
          "required_relationships",
          "contradiction",
          "coverage",
          "evidence_state",
        ],
      },
    };
  },
};

function legalCitations(text: string) {
  const matches = text.match(
    /(?:[가-힣·\s]+(?:법|법률|시행령|시행규칙)\s*)?제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?/g,
  );
  return compact(matches ?? [], 16);
}

function applicableLaws(text: string) {
  const matches = text.match(
    /[가-힣·]{2,30}(?:법률|시행령|시행규칙|법)(?=\s|제|에|의|상|$)/g,
  );
  return compact(matches ?? [], 12);
}

function legalEffectiveDate(text: string) {
  for (const sentence of sentences(text)) {
    if (
      !/(?:법령|법률|조문|시행령|시행규칙)/i.test(sentence) ||
      !/(?:시행일|유효일|법령\s*버전|법령\s*기준일|적용\s*기준일)/i.test(
        sentence,
      )
    ) {
      continue;
    }
    const date = sentence.match(
      /\b(?:19|20)\d{2}[.\-/년]\s*\d{1,2}(?:[.\-/월]\s*\d{1,2}일?)?\b/,
    );
    if (date) return date[0];
  }
  return null;
}

export const LawAdapter: OwnerAlphaSubjectAdapterPort<OwnerAlphaLawAdapterModel> = {
  subject: "appraisal_compensation_law",
  name: "LawAdapter",
  compile({ problemText, routing, model }) {
    const effectiveAt = legalEffectiveDate(problemText);
    const citations = legalCitations(problemText);
    const laws = applicableLaws(problemText);
    const legalRequirements = matchingSentences(
      problemText,
      /요건|경우|하여야|해야|충족|요구/,
    );
    return {
      contractVersion: OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
      adapter: "LawAdapter",
      subject: "appraisal_compensation_law",
      secondaryDomains: routing.secondaryDomains,
      domainTags: routing.domainTags,
      problemType:
        routing.secondaryDomains.length > 0
          ? "mixed_domain_compensation_law_case"
          : "compensation_law_case",
      answerPlan: answerPlan(
        [
          "법적 쟁점",
          "적용 법령·법리",
          "요건 분해",
          "사실-요건 대응",
          "사안 포섭",
          "법적 효과·절차",
          "반대 해석",
          "결론",
        ],
        model.pointAllocation,
        "source_version_structure_and_subsumption",
      ),
      gapTypes: OWNER_ALPHA_LAW_GAP_TYPES,
      rewriteModes: OWNER_ALPHA_LAW_REWRITE_MODES,
      defaultRewriteMode: "issue_rule_application_conclusion",
      transferTask: {
        mode: "condition_variant",
        prompt: "사실 또는 절차 조건 하나만 바꾼 뒤 쟁점·근거·요건·포섭·결론을 다시 연결하세요.",
      },
      legalIssueCandidates: model.requirements.map((item) => item.text),
      applicableLawCandidates:
        laws.length > 0
          ? laws.map((label) => ({
              label,
              state: "problem_given" as const,
              officialSourceRefId: null,
            }))
          : [
              {
                label: "적용 법령 후보 확인 필요",
                state: "unresolved_needs_review" as const,
                officialSourceRefId: null,
              },
            ],
      articleAndParagraphReferences: citations.map((citation) => ({
        citation,
        state: "problem_given" as const,
        officialSourceRefId: null,
        effectiveAt,
      })),
      effectiveDateRequirement: {
        required: true,
        effectiveAt,
        state: effectiveAt ? "problem_given" : "unresolved_needs_review",
        officialSourceRefId: null,
      },
      legalRequirements,
      factsMappedToEachRequirement: legalRequirements.map((requirement) => ({
        requirement,
        factCandidates: model.givenFacts.map((fact) => fact.value).slice(0, 8),
      })),
      applicationOrSubsumption: matchingSentences(
        problemText,
        /포섭|사안|해당|적용|충족/,
      ),
      legalEffect: matchingSentences(
        problemText,
        /효과|무효|취소|보상|권리|의무|성립/,
      ),
      procedure: matchingSentences(
        problemText,
        /절차|재결|신청|통지|사업인정|수용|이의/,
      ),
      precedentOrAdjudicationReference: matchingSentences(
        problemText,
        /대법원|헌법재판소|판례|재결례|결정례/,
      ).map((citation) => ({
        citation,
        state: "problem_given" as const,
        officialSourceRefId: null,
      })),
      opposingInterpretation: matchingSentences(
        problemText,
        /반대|다만|반면|달리|이견|견해/,
      ),
      conclusion: matchingSentences(problemText, /결론|따라서|그러므로/),
      unresolvedSourceOrVersionIssue: [
        ...(effectiveAt ? [] : ["적용 법령의 유효일을 확인해야 합니다."]),
        ...(citations.length > 0
          ? ["문제에 제시된 조문 후보가 공식 원문 참조와 아직 연결되지 않았습니다."]
          : ["조문·항 참조를 공식 원문과 대조해야 합니다."]),
      ],
      validationPolicy: {
        officialPromotionRequiresStoredSourceRef: true,
        unknownEffectiveDateFailsClosed: true,
        automatedLegalCorrectnessScoringAllowed: false,
      },
    };
  },
};

export function compileOwnerAlphaSubjectAdapter(
  input: AdapterCompileInput,
): OwnerAlphaSubjectAdapterModel {
  if (input.routing.primarySubject === "appraisal_theory") {
    return TheoryAdapter.compile(input);
  }
  if (input.routing.primarySubject === "appraisal_compensation_law") {
    return LawAdapter.compile(input);
  }
  return PracticalAdapter.compile(input);
}

export function ownerAlphaSubjectReferenceReleaseBlockers(input: {
  problemModel: OwnerAlphaPracticeProblemModel;
  claims: OwnerAlphaClaimState[];
}) {
  const adapter = input.problemModel.subjectAdapter;
  if (!adapter) return [];
  const blockers: string[] = [];
  if (adapter.adapter === "TheoryAdapter") {
    for (const claim of input.claims) {
      if (
        ["concept", "method", "source"].includes(claim.claimType) &&
        claim.state === "deterministically_validated"
      ) {
        blockers.push(`theory:substantive_claim_not_deterministic:${claim.claimId}`);
      }
    }
  }
  if (adapter.adapter === "LawAdapter") {
    if (
      adapter.effectiveDateRequirement.state === "unresolved_needs_review" ||
      !adapter.effectiveDateRequirement.effectiveAt
    ) {
      blockers.push("law:effective_date_unknown");
    }
    const officialRefs = new Set(
      [
        ...adapter.applicableLawCandidates,
        ...adapter.articleAndParagraphReferences,
        ...adapter.precedentOrAdjudicationReference,
      ]
        .filter(
          (reference) =>
            reference.state === "official_source_grounded" &&
            reference.officialSourceRefId?.trim(),
        )
        .map((reference) => reference.officialSourceRefId as string),
    );
    for (const claim of input.claims) {
      if (
        claim.state === "official_source_grounded" &&
        !claim.evidenceRefIds.some((reference) => officialRefs.has(reference))
      ) {
        blockers.push(`law:official_source_reference_missing:${claim.claimId}`);
      }
    }
    for (const reference of [
      ...adapter.applicableLawCandidates,
      ...adapter.articleAndParagraphReferences,
      ...adapter.precedentOrAdjudicationReference,
    ]) {
      if (
        reference.state === "official_source_grounded" &&
        !reference.officialSourceRefId?.trim()
      ) {
        blockers.push("law:official_source_promotion_without_reference");
      }
    }
  }
  return [...new Set(blockers)];
}

export function ownerAlphaSubjectProviderInstructions(
  model: OwnerAlphaPracticeProblemModel,
) {
  const adapter = model.subjectAdapter;
  if (!adapter) {
    return [
      "감정평가실무의 방법·산식·자료 역할·단위·검산을 구조화한다.",
    ];
  }
  if (adapter.adapter === "TheoryAdapter") {
    return [
      "감정평가이론 답안은 정의·명제, 전제, 논증, 비교, 적용, 평가, 결론의 관계를 구조화한다.",
      "결정론적 점수나 유일한 정답을 꾸며내지 않는다.",
      `gapType은 ${OWNER_ALPHA_THEORY_GAP_TYPES.join(", ")} 중 하나만 사용한다.`,
      `재작성은 ${OWNER_ALPHA_THEORY_REWRITE_MODES.join(", ")} 중 하나에 맞춘다.`,
      "논쟁적 실체 주장은 ai_inference, cross_checked_ai, unresolved_needs_review 범위에서만 표현한다.",
    ];
  }
  if (adapter.adapter === "LawAdapter") {
    return [
      "감정평가 및 보상법규 답안은 쟁점, 법적 근거 후보, 요건, 사실 대응, 포섭, 효과, 절차, 반대 해석, 결론을 구조화한다.",
      "저장된 공식 원문 참조 없이 어떤 AI 법적 진술도 official_source_grounded로 표시하지 않는다.",
      "법령 유효일이나 버전이 불명확하면 unresolved_needs_review로 두고 단정하지 않는다.",
      `gapType은 ${OWNER_ALPHA_LAW_GAP_TYPES.join(", ")} 중 하나만 사용한다.`,
      `재작성은 ${OWNER_ALPHA_LAW_REWRITE_MODES.join(", ")} 중 하나에 맞춘다.`,
    ];
  }
  return [
    "감정평가실무 답안은 자료 역할, 평가 시점, 방법 후보와 배제 근거, 산식, 단위, 검산, 결론을 구조화한다.",
    "지원되는 계산만 결정론적 calculation node로 만들고 충돌 또는 미지원 critical 계산은 공개하지 않는다.",
  ];
}

export function ownerAlphaSubjectRewriteModeLabel(value: string) {
  const labels: Record<string, string> = {
    recalculation: "재계산",
    answer_structure_rewrite: "답안 구조 재작성",
    outline_reconstruction: "목차 재구성",
    paragraph_rewrite: "문단 재작성",
    argument_bridge: "논증 연결 보강",
    compare_and_evaluate: "비교·평가 재작성",
    blank_recall: "빈 화면 인출",
    issue_rule_application_conclusion: "쟁점-근거-포섭-결론",
    requirement_mapping: "요건-사실 대응",
    subsumption_rewrite: "사안 포섭 재작성",
    legal_basis_recall: "법적 근거 인출",
    effective_date_check: "유효일 확인",
    precedent_application: "판례·재결 적용",
  };
  return labels[value] ?? value;
}

export function ownerAlphaSubjectHeading(model: OwnerAlphaPracticeProblemModel) {
  const subject = model.subjectAdapter?.subject ?? "appraisal_practical";
  return `${ownerAlphaSubjectLabel(subject)} 범용 학습 루프`;
}
