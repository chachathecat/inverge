export type ConceptNodeCandidate = {
  metadataOnly: true;
  conceptNodeId: string;
  examMode: "first" | "second";
  subject: string;
  conceptFamily: string;
  retrievalPrompt: string;
  nextTaskType: string;
  mistakeType?: string;
  sourceStatus: "draft";
  needsOfficialVerification: true;
};

type ConceptMode = ConceptNodeCandidate["examMode"];

type SubjectConceptConfig = {
  families: string[];
  retrievalPrompt: (conceptFamily: string) => string;
  nextTaskType: (conceptFamily: string, mistakeType?: string) => string;
};

type BuildConceptNodeCandidateInput = {
  mode: ConceptMode;
  subject: string;
  metadata?: Record<string, unknown> | null;
  conceptFamily?: string | null;
  mistakeType?: string | null;
};

const FIRST_CONCEPT_CONFIG: Record<string, SubjectConceptConfig> = {
  민법: {
    families: ["권리주체", "법률행위", "의사표시", "무효와 취소", "대리", "물권", "소유권", "담보물권"],
    retrievalPrompt: (family) => `${family}에서 요건/효과/예외/판례 연결 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/암기|빈칸/.test(text)) return "cloze";
      if (/오독|함정|표현/.test(text)) return "trap_word";
      return "ox_retrieval";
    },
  },
  경제학원론: {
    families: ["수요공급", "탄력성", "소비자이론", "생산자이론", "시장이론", "국민소득", "IS-LM", "AD-AS", "물가실업", "국제경제"],
    retrievalPrompt: (family) => `${family}에서 그래프 이동/균형 변화/수식 의미 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (family) => {
      if (/탄력성|국민소득/.test(family)) return "formula_check";
      if (/수요공급|IS-LM|AD-AS|시장|물가|국제/.test(family)) return "graph_recall";
      return "ox_retrieval";
    },
  },
  부동산학원론: {
    families: ["부동산 개념", "부동산 시장", "입지/도시", "부동산 정책", "투자론", "금융론", "개발/관리", "감정평가 기초"],
    retrievalPrompt: (family) => `${family}에서 정의/공식/정책 효과 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/투자|금융|공식|계산/.test(text)) return "formula_check";
      if (/암기|빈칸|정의/.test(text)) return "cloze";
      return "concept_recall";
    },
  },
  감정평가관계법규: {
    families: ["감정평가법", "감정평가사법", "토지보상법", "부동산공시법", "국토계획법", "도시정비법", "건축법"],
    retrievalPrompt: (family) => `${family}에서 조문/요건/절차/예외 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (_family, mistakeType) => {
      if (/암기|빈칸/.test(mistakeType ?? "")) return "cloze";
      if (/오독|함정|표현/.test(mistakeType ?? "")) return "trap_word";
      return "legal_requirement_recall";
    },
  },
  회계학: {
    families: ["재무회계 기초", "재고자산", "유형자산", "무형자산", "금융자산", "부채/사채", "자본", "수익", "원가관리", "CVP"],
    retrievalPrompt: (family) => `${family}에서 분개/인식/측정/표시/계산 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/재고|사채|부채|원가|CVP|계산|분개/.test(text)) return "accounting_template";
      return "formula_check";
    },
  },
};

const SECOND_CONCEPT_CONFIG: Record<string, SubjectConceptConfig> = {
  감정평가실무: {
    families: ["3방식", "원가방식", "비교방식", "수익방식", "토지평가", "건물평가", "임대료평가", "보상평가", "특수물건", "검산/CASIO"],
    retrievalPrompt: (family) => `${family}에서 산식/단위/계산과정/결론 기재값 중 하나를 먼저 적어 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/검산|CASIO|반올림|단위/.test(text)) return "calculator_routine";
      if (/3방식|원가|비교|수익|평가|산식|계산/.test(text)) return "formula_check";
      return "paragraph_rewrite";
    },
  },
  감정평가이론: {
    families: ["감정평가의 본질", "가치이론", "시장분석", "최고최선이용", "3방식 이론", "시장가치/공정가치", "감정평가 절차", "평가윤리"],
    retrievalPrompt: (family) => `${family}에서 정의/논거/비교/사례 적용 키워드를 먼저 떠올려 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/목차|구조|outline/.test(text)) return "outline_recall";
      if (/정의|키워드|가치|최고최선|시장/.test(text)) return "keyword_recall";
      return "paragraph_rewrite";
    },
  },
  "감정평가 및 보상법규": {
    families: ["행정법 기초", "토지보상법", "사업인정", "수용재결", "손실보상 원칙", "보상항목", "행정쟁송", "감정평가법령"],
    retrievalPrompt: (family) => `${family}에서 쟁점/조문/요건/사안 포섭/결론 중 하나를 먼저 떠올려 보세요.`,
    nextTaskType: (family, mistakeType) => {
      const text = `${family} ${mistakeType ?? ""}`;
      if (/포섭|요건|조문/.test(text)) return "requirement_subsumption";
      if (/사업인정|수용재결|쟁점|처분성|이의재결/.test(text)) return "legal_issue_recall";
      return "paragraph_rewrite";
    },
  },
};

const CONCEPT_CONFIG_BY_MODE: Record<ConceptMode, Record<string, SubjectConceptConfig>> = {
  first: FIRST_CONCEPT_CONFIG,
  second: SECOND_CONCEPT_CONFIG,
};

const RAW_METADATA_KEY_PATTERN =
  /raw|ocr|원문|본문|problemText|questionText|answerText|userAnswer|correctAnswer|officialAnswer|copyright|sourceText|confirmedText|rewriteParagraph/i;

const SAFE_METADATA_KEY_PATTERN =
  /^(topic_candidate|topicCandidate|concept_candidate|conceptCandidate|conceptFamily|mistake_type|mistakeType|weak_structure_point|weakStructurePoint|missing_issue|missingIssue|missingIssueCandidate|keyConcepts|nextAction|calculationRisk|unitRisk|taxonomy_node_label|taxonomyNodeLabel|skeleton_keyword_hint|supportedCalculatorTemplateId)$/i;

const FAMILY_KEYWORD_RULES: Record<string, Array<{ family: string; patterns: RegExp[] }>> = {
  "first:민법": [
    { family: "무효와 취소", patterns: [/무효/, /취소/, /추인/, /소급효/] },
    { family: "의사표시", patterns: [/의사표시/, /착오/, /사기/, /강박/, /통정/, /비진의/] },
    { family: "법률행위", patterns: [/법률행위/, /반사회/, /불공정/, /행위능력/] },
    { family: "대리", patterns: [/대리/, /표현대리/, /무권대리/] },
    { family: "담보물권", patterns: [/저당/, /담보/, /유치권/, /질권/] },
    { family: "소유권", patterns: [/소유권/, /취득시효/, /공유/] },
    { family: "물권", patterns: [/물권/, /점유/, /등기/] },
    { family: "권리주체", patterns: [/권리주체/, /법인/, /자연인/] },
  ],
  "first:경제학원론": [
    { family: "탄력성", patterns: [/탄력성/] },
    { family: "IS-LM", patterns: [/is[-\s]?lm/i, /이자율/, /화폐시장/] },
    { family: "AD-AS", patterns: [/ad[-\s]?as/i, /총수요/, /총공급/] },
    { family: "수요공급", patterns: [/수요/, /공급/, /균형/, /초과수요/, /초과공급/] },
    { family: "소비자이론", patterns: [/효용/, /무차별/, /예산선/] },
    { family: "생산자이론", patterns: [/생산/, /비용/, /한계비용/] },
    { family: "시장이론", patterns: [/독점/, /완전경쟁/, /과점/] },
    { family: "국민소득", patterns: [/국민소득/, /GDP/, /승수/i] },
    { family: "물가실업", patterns: [/물가/, /실업/, /필립스/] },
    { family: "국제경제", patterns: [/환율/, /국제수지/, /무역/] },
  ],
  "first:부동산학원론": [
    { family: "감정평가 기초", patterns: [/감정평가/, /가격/, /가치/] },
    { family: "투자론", patterns: [/투자/, /NPV/i, /IRR/i, /수익률/] },
    { family: "금융론", patterns: [/금융/, /대출/, /저당/, /LTV/i] },
    { family: "부동산 정책", patterns: [/정책/, /조세/, /규제/] },
    { family: "입지/도시", patterns: [/입지/, /도시/, /상권/] },
    { family: "부동산 시장", patterns: [/시장/, /수요/, /공급/] },
    { family: "개발/관리", patterns: [/개발/, /관리/, /운영/] },
    { family: "부동산 개념", patterns: [/부동산/, /정착물/, /복합개념/] },
  ],
  "first:감정평가관계법규": [
    { family: "토지보상법", patterns: [/토지보상/, /보상/, /수용/, /재결/] },
    { family: "감정평가법", patterns: [/감정평가법/, /감정평가법인/] },
    { family: "감정평가사법", patterns: [/감정평가사/, /징계/, /등록/] },
    { family: "부동산공시법", patterns: [/공시/, /공시지가/, /가격공시/] },
    { family: "국토계획법", patterns: [/국토계획/, /도시관리계획/, /용도지역/] },
    { family: "도시정비법", patterns: [/정비사업/, /재개발/, /재건축/] },
    { family: "건축법", patterns: [/건축/, /건폐율/, /용적률/] },
  ],
  "first:회계학": [
    { family: "재고자산", patterns: [/재고/, /저가법/, /순실현가능가치/, /NRV/i] },
    { family: "부채/사채", patterns: [/사채/, /상각후원가/, /이자비용/, /유효이자/] },
    { family: "유형자산", patterns: [/유형자산/, /감가상각/, /재평가/] },
    { family: "무형자산", patterns: [/무형자산/, /상각/, /영업권/] },
    { family: "금융자산", patterns: [/금융자산/, /FVOCI/i, /FVTPL/i, /상각후원가/] },
    { family: "수익", patterns: [/수익인식/, /수익/, /계약부채/] },
    { family: "원가관리", patterns: [/원가/, /표준원가/, /변동원가/] },
    { family: "CVP", patterns: [/CVP/i, /손익분기/, /공헌이익/] },
    { family: "자본", patterns: [/자본/, /주식/, /배당/] },
    { family: "재무회계 기초", patterns: [/재무회계/, /분개/, /인식/, /측정/] },
  ],
  "second:감정평가실무": [
    { family: "검산/CASIO", patterns: [/CASIO/i, /검산/, /단위/, /반올림/, /계산기/] },
    { family: "수익방식", patterns: [/수익/, /환원/, /환원이율/, /순수익/, /DCF/i] },
    { family: "원가방식", patterns: [/원가/, /재조달원가/, /감가수정/] },
    { family: "비교방식", patterns: [/비교/, /거래사례/, /사례선정/] },
    { family: "토지평가", patterns: [/토지/, /공시지가/, /개별요인/] },
    { family: "건물평가", patterns: [/건물/, /내용연수/, /감가/] },
    { family: "임대료평가", patterns: [/임대료/, /실질임료/, /지불임료/] },
    { family: "보상평가", patterns: [/보상/, /손실보상/, /영업손실/] },
    { family: "특수물건", patterns: [/특수물건/, /구분소유/, /공장/] },
    { family: "3방식", patterns: [/3방식/, /삼방식/, /방식/] },
  ],
  "second:감정평가이론": [
    { family: "최고최선이용", patterns: [/최고최선이용/, /최유효이용/] },
    { family: "시장가치/공정가치", patterns: [/시장가치/, /공정가치/] },
    { family: "감정평가의 본질", patterns: [/본질/, /감정평가의 기능/] },
    { family: "가치이론", patterns: [/가치이론/, /가치형성/, /가격형성/] },
    { family: "시장분석", patterns: [/시장분석/, /시장성/] },
    { family: "3방식 이론", patterns: [/3방식/, /원가방식/, /비교방식/, /수익방식/] },
    { family: "감정평가 절차", patterns: [/절차/, /기본적 사항/, /처리계획/] },
    { family: "평가윤리", patterns: [/윤리/, /독립성/, /이해상충/] },
  ],
  "second:감정평가 및 보상법규": [
    { family: "사업인정", patterns: [/사업인정/, /처분성/] },
    { family: "수용재결", patterns: [/수용재결/, /이의재결/] },
    { family: "행정법 기초", patterns: [/행정행위/, /처분/, /재량/] },
    { family: "토지보상법", patterns: [/토지보상/, /공익사업/] },
    { family: "손실보상 원칙", patterns: [/손실보상/, /정당보상/, /완전보상/] },
    { family: "보상항목", patterns: [/보상항목/, /영업보상/, /이주대책/] },
    { family: "행정쟁송", patterns: [/행정쟁송/, /항고소송/, /취소소송/] },
    { family: "감정평가법령", patterns: [/감정평가법/, /감정평가법령/] },
  ],
};

function getConfig(mode: ConceptMode, subject: string): SubjectConceptConfig | null {
  return CONCEPT_CONFIG_BY_MODE[mode][subject] ?? null;
}

function normalizeShortLabel(value: unknown, maxLength = 48): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(RAW_METADATA_KEY_PATTERN, "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function collectSafeMetadataText(value: unknown, parentKey = ""): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const normalized = normalizeShortLabel(value, 80);
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectSafeMetadataText(entry, parentKey)).slice(0, 12);
  }
  if (typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    if (RAW_METADATA_KEY_PATTERN.test(key)) return [];
    if (parentKey && !SAFE_METADATA_KEY_PATTERN.test(parentKey)) return [];
    if (!SAFE_METADATA_KEY_PATTERN.test(key) && typeof entry !== "string" && !Array.isArray(entry)) return [];
    if (!SAFE_METADATA_KEY_PATTERN.test(key) && typeof entry === "string") return [];
    return collectSafeMetadataText(entry, key);
  });
}

function fallbackConceptFamily(mode: ConceptMode, subject: string) {
  const config = getConfig(mode, subject);
  if (config) return config.families[0];
  return mode === "first" ? "1차 개념 후보" : "2차 논점 후보";
}

function toConceptNodeId(mode: ConceptMode, subject: string, conceptFamily: string) {
  const subjectPart = subject.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "subject";
  const familyPart = conceptFamily.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "concept";
  return `concept:${mode}:${subjectPart}:${familyPart}`;
}

export function mapSubjectToConceptFamilies(mode: ConceptMode, subject: string): string[] {
  return [...(getConfig(mode, subject)?.families ?? [])];
}

export function inferConceptFamilyFromMetadata(mode: ConceptMode, subject: string, metadata: Record<string, unknown> | null | undefined): string {
  const config = getConfig(mode, subject);
  if (!config) return fallbackConceptFamily(mode, subject);

  const text = [subject, ...collectSafeMetadataText(metadata)].join(" ");
  const rules = FAMILY_KEYWORD_RULES[`${mode}:${subject}`] ?? [];
  const match = rules.find((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  if (match && config.families.includes(match.family)) return match.family;
  return config.families[0];
}

export function buildRetrievalPromptForConcept(mode: ConceptMode, subject: string, conceptFamily: string, _mistakeType?: string): string {
  void _mistakeType;
  return getConfig(mode, subject)?.retrievalPrompt(conceptFamily)
    ?? (mode === "first"
      ? `${conceptFamily}에서 기준 1개를 먼저 떠올려 보세요.`
      : `${conceptFamily}에서 오늘 보강할 기준 1개를 먼저 떠올려 보세요.`);
}

export function buildNextTaskTypeForConcept(mode: ConceptMode, subject: string, conceptFamily: string, mistakeType?: string): string {
  return getConfig(mode, subject)?.nextTaskType(conceptFamily, mistakeType)
    ?? (mode === "first" ? "concept_recall" : "paragraph_rewrite");
}

export function buildConceptNodeCandidate(input: BuildConceptNodeCandidateInput): ConceptNodeCandidate {
  const conceptFamily =
    normalizeShortLabel(input.conceptFamily, 48) ?? inferConceptFamilyFromMetadata(input.mode, input.subject, input.metadata);
  const mistakeType = normalizeShortLabel(input.mistakeType, 40) ?? normalizeShortLabel(input.metadata?.mistake_type, 40) ?? undefined;

  return {
    metadataOnly: true,
    conceptNodeId: toConceptNodeId(input.mode, input.subject, conceptFamily),
    examMode: input.mode,
    subject: input.subject,
    conceptFamily,
    retrievalPrompt: buildRetrievalPromptForConcept(input.mode, input.subject, conceptFamily, mistakeType),
    nextTaskType: buildNextTaskTypeForConcept(input.mode, input.subject, conceptFamily, mistakeType),
    ...(mistakeType ? { mistakeType } : {}),
    sourceStatus: "draft",
    needsOfficialVerification: true,
  };
}

export function isConceptNodeCandidate(value: unknown): value is ConceptNodeCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ConceptNodeCandidate>;
  return candidate.metadataOnly === true
    && (candidate.examMode === "first" || candidate.examMode === "second")
    && typeof candidate.conceptNodeId === "string"
    && typeof candidate.subject === "string"
    && typeof candidate.conceptFamily === "string"
    && typeof candidate.retrievalPrompt === "string"
    && typeof candidate.nextTaskType === "string"
    && candidate.sourceStatus === "draft"
    && candidate.needsOfficialVerification === true;
}
