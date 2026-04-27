export type AppraisalMode = "first" | "second";

export type AppraisalTaxonomyNode = {
  id: string;
  mode: AppraisalMode;
  subject: string;
  unit: string;
  topic: string;
  subtopic?: string;
  examSkill: string;
  commonMistakeTypes: string[];
  retrievalCue: string;
  tags: string[];
};

export type TaxonomySearchInput = {
  mode: AppraisalMode;
  subject?: string;
  text: string;
};

export type TaxonomySearchCandidate = {
  node: AppraisalTaxonomyNode;
  score: number;
  matchedKeywords: string[];
};

export const APPRAISAL_TAXONOMY_NODES: AppraisalTaxonomyNode[] = [
  // 1차 - 민법
  {
    id: "first-civil-general-principles",
    mode: "first",
    subject: "민법",
    unit: "총칙",
    topic: "권리변동 일반",
    examSkill: "요건 정리",
    commonMistakeTypes: ["개념 혼동", "요건 누락"],
    retrievalCue: "민법 총칙에서 권리변동의 성립 요건을 3단계로 말해보세요.",
    tags: ["민법", "총칙", "권리변동", "성립요건"],
  },
  {
    id: "first-civil-property-right-change",
    mode: "first",
    subject: "민법",
    unit: "물권",
    topic: "물권변동",
    examSkill: "요건 적용",
    commonMistakeTypes: ["공시요건 누락", "법률행위/법률규정 구분 실패"],
    retrievalCue: "물권변동 성립 시 필요한 공시요건을 사례형으로 확인하세요.",
    tags: ["민법", "물권", "물권변동", "요건", "공시"],
  },
  {
    id: "first-civil-obligation-performance",
    mode: "first",
    subject: "민법",
    unit: "채권",
    topic: "채무불이행",
    examSkill: "책임요건 판별",
    commonMistakeTypes: ["손해배상 범위 오판", "귀책사유 판단 누락"],
    retrievalCue: "채무불이행 유형별 책임요건을 대비표로 구분해보세요.",
    tags: ["민법", "채권", "채무불이행", "손해배상"],
  },
  {
    id: "first-civil-special-act-basics",
    mode: "first",
    subject: "민법",
    unit: "민사특별법 기초",
    topic: "주요 특별법 구조",
    examSkill: "법률 간 비교",
    commonMistakeTypes: ["적용법 선택 오류", "요건-효과 연결 실패"],
    retrievalCue: "민사특별법의 적용 순서를 사례 기준으로 말해보세요.",
    tags: ["민법", "민사특별법", "적용순서", "요건효과"],
  },

  // 1차 - 경제학원론
  {
    id: "first-econ-demand-supply",
    mode: "first",
    subject: "경제학원론",
    unit: "수요공급",
    topic: "균형가격 결정",
    examSkill: "그래프 해석",
    commonMistakeTypes: ["곡선 이동/점 이동 혼동", "균형 변화 방향 오판"],
    retrievalCue: "수요 또는 공급 변화 시 균형가격·균형거래량 변화를 설명해보세요.",
    tags: ["경제학원론", "수요", "공급", "균형가격", "균형거래량"],
  },
  {
    id: "first-econ-elasticity",
    mode: "first",
    subject: "경제학원론",
    unit: "탄력성",
    topic: "가격탄력성",
    examSkill: "수치 계산",
    commonMistakeTypes: ["분모/분자 방향 오류", "해석 문장 누락"],
    retrievalCue: "가격탄력성 계산 후 수요 반응을 문장으로 해석해보세요.",
    tags: ["경제학원론", "탄력성", "가격탄력성", "계산", "해석"],
  },
  {
    id: "first-econ-consumer-producer",
    mode: "first",
    subject: "경제학원론",
    unit: "소비자/생산자",
    topic: "잉여 분석",
    examSkill: "후생 변화 판별",
    commonMistakeTypes: ["소비자잉여/생산자잉여 혼동", "정책효과 과대해석"],
    retrievalCue: "세금 부과 전후 소비자잉여·생산자잉여 변화를 비교해보세요.",
    tags: ["경제학원론", "소비자", "생산자", "잉여", "후생"],
  },
  {
    id: "first-econ-market-equilibrium",
    mode: "first",
    subject: "경제학원론",
    unit: "시장균형",
    topic: "정책개입 효과",
    examSkill: "정책영향 해석",
    commonMistakeTypes: ["가격상한/가격하한 혼동", "초과수요·초과공급 판별 오류"],
    retrievalCue: "가격규제 도입 시 시장균형 이탈을 단계적으로 설명해보세요.",
    tags: ["경제학원론", "시장균형", "가격상한", "가격하한", "정책"],
  },
  {
    id: "first-econ-macro-basics",
    mode: "first",
    subject: "경제학원론",
    unit: "거시기초",
    topic: "국민소득 기초",
    examSkill: "기초개념 연결",
    commonMistakeTypes: ["명목/실질 혼동", "지표 간 관계 혼동"],
    retrievalCue: "국민소득 관련 핵심 지표를 정의와 함께 설명해보세요.",
    tags: ["경제학원론", "거시", "국민소득", "명목", "실질"],
  },

  // 1차 - 부동산학원론
  {
    id: "first-realestate-concept",
    mode: "first",
    subject: "부동산학원론",
    unit: "부동산 개념",
    topic: "부동산 특성",
    examSkill: "핵심개념 구분",
    commonMistakeTypes: ["물리적/경제적 특성 혼동", "정의 암기 중심 응답"],
    retrievalCue: "부동산 특성을 거래·가격 형성과 연결해 설명해보세요.",
    tags: ["부동산학원론", "부동산 개념", "특성", "정의"],
  },
  {
    id: "first-realestate-market",
    mode: "first",
    subject: "부동산학원론",
    unit: "시장론",
    topic: "시장구조",
    examSkill: "시장현상 해석",
    commonMistakeTypes: ["부분시장 구분 누락", "수급요인 나열만 수행"],
    retrievalCue: "부동산 시장구조를 일반재 시장과 비교해보세요.",
    tags: ["부동산학원론", "시장론", "시장구조", "수급"],
  },
  {
    id: "first-realestate-policy",
    mode: "first",
    subject: "부동산학원론",
    unit: "정책론",
    topic: "정책수단",
    examSkill: "정책효과 비교",
    commonMistakeTypes: ["정책목표-수단 불일치", "부작용 검토 누락"],
    retrievalCue: "대표적 부동산 정책수단 2개를 효과와 한계로 비교해보세요.",
    tags: ["부동산학원론", "정책론", "정책수단", "효과", "한계"],
  },
  {
    id: "first-realestate-finance",
    mode: "first",
    subject: "부동산학원론",
    unit: "금융론",
    topic: "대출과 금리",
    examSkill: "재무관계 해석",
    commonMistakeTypes: ["LTV/DSR 개념 혼동", "금리변동 영향 과소평가"],
    retrievalCue: "금리 상승이 부동산 금융 의사결정에 미치는 영향을 정리해보세요.",
    tags: ["부동산학원론", "금융론", "금리", "대출", "LTV", "DSR"],
  },
  {
    id: "first-realestate-investment",
    mode: "first",
    subject: "부동산학원론",
    unit: "투자론",
    topic: "수익률 판단",
    examSkill: "투자지표 계산",
    commonMistakeTypes: ["현금흐름 누락", "수익률 비교 기준 불명확"],
    retrievalCue: "주어진 현금흐름으로 투자안 수익성을 판단해보세요.",
    tags: ["부동산학원론", "투자론", "수익률", "현금흐름"],
  },
  {
    id: "first-realestate-appraisal-basics",
    mode: "first",
    subject: "부동산학원론",
    unit: "감정평가 기초",
    topic: "가격과 가치",
    examSkill: "평가기초 연결",
    commonMistakeTypes: ["가격/가치 혼용", "평가원칙 적용 누락"],
    retrievalCue: "가격과 가치의 차이를 감정평가 사례와 연결해보세요.",
    tags: ["부동산학원론", "감정평가 기초", "가격", "가치"],
  },

  // 1차 - 감정평가관계법규
  {
    id: "first-law-appraisal-act",
    mode: "first",
    subject: "감정평가관계법규",
    unit: "감정평가법",
    topic: "업무 요건",
    examSkill: "조문 포인트 회상",
    commonMistakeTypes: ["주체 요건 혼동", "금지행위 누락"],
    retrievalCue: "감정평가법상 핵심 주체와 요건을 조문 기준으로 정리해보세요.",
    tags: ["감정평가관계법규", "감정평가법", "요건", "조문"],
  },
  {
    id: "first-law-public-disclosure",
    mode: "first",
    subject: "감정평가관계법규",
    unit: "부동산공시법",
    topic: "공시체계",
    examSkill: "제도 비교",
    commonMistakeTypes: ["공시수단 혼동", "절차 순서 누락"],
    retrievalCue: "부동산공시법의 공시체계를 단계적으로 설명해보세요.",
    tags: ["감정평가관계법규", "부동산공시법", "공시", "절차"],
  },
  {
    id: "first-law-land-planning",
    mode: "first",
    subject: "감정평가관계법규",
    unit: "국토계획법",
    topic: "용도지역·지구",
    examSkill: "규제효과 해석",
    commonMistakeTypes: ["용도지역 구분 오류", "행위제한 범위 누락"],
    retrievalCue: "국토계획법상 용도지역 지정 효과를 사례로 설명해보세요.",
    tags: ["감정평가관계법규", "국토계획법", "용도지역", "행위제한"],
  },
  {
    id: "first-law-compensation-basics",
    mode: "first",
    subject: "감정평가관계법규",
    unit: "보상법 기초",
    topic: "손실보상 원칙",
    examSkill: "원칙 적용",
    commonMistakeTypes: ["보상대상 오판", "원칙 적용 순서 혼동"],
    retrievalCue: "보상법 기초에서 손실보상 원칙을 핵심 키워드로 정리해보세요.",
    tags: ["감정평가관계법규", "보상법", "손실보상", "원칙"],
  },
  {
    id: "first-law-procedure-requirements",
    mode: "first",
    subject: "감정평가관계법규",
    unit: "절차/요건",
    topic: "행정절차 핵심",
    examSkill: "절차 체크",
    commonMistakeTypes: ["선후관계 오류", "필수요건 누락"],
    retrievalCue: "절차형 문제에서 빠지기 쉬운 필수요건을 체크리스트로 말해보세요.",
    tags: ["감정평가관계법규", "절차", "요건", "행정절차"],
  },

  // 1차 - 회계학
  {
    id: "first-accounting-financial-basics",
    mode: "first",
    subject: "회계학",
    unit: "재무회계 기초",
    topic: "재무제표 구조",
    examSkill: "계정흐름 이해",
    commonMistakeTypes: ["차변/대변 혼동", "재무제표 연결 실패"],
    retrievalCue: "거래 발생 시 재무제표 항목 변화까지 설명해보세요.",
    tags: ["회계학", "재무회계", "재무제표", "차변", "대변"],
  },
  {
    id: "first-accounting-inventory-lcm",
    mode: "first",
    subject: "회계학",
    unit: "재고자산",
    topic: "저가법",
    subtopic: "측정",
    examSkill: "평가손실 판단",
    commonMistakeTypes: ["원가/순실현가능가치 비교 오류", "평가손실 반영 누락"],
    retrievalCue: "재고자산 저가법 적용 절차를 숫자 예시로 복기해보세요.",
    tags: ["회계학", "재고자산", "저가법", "측정", "NRV"],
  },
  {
    id: "first-accounting-ppne",
    mode: "first",
    subject: "회계학",
    unit: "유형자산",
    topic: "감가상각",
    examSkill: "기간배분 계산",
    commonMistakeTypes: ["내용연수 적용 오류", "잔존가치 반영 누락"],
    retrievalCue: "유형자산 감가상각 계산 과정을 단계별로 써보세요.",
    tags: ["회계학", "유형자산", "감가상각", "내용연수"],
  },
  {
    id: "first-accounting-financial-assets",
    mode: "first",
    subject: "회계학",
    unit: "금융자산",
    topic: "분류와 측정",
    examSkill: "분류판단",
    commonMistakeTypes: ["분류기준 오판", "손익/OCI 반영 혼동"],
    retrievalCue: "금융자산 분류 기준과 측정 방법을 비교해보세요.",
    tags: ["회계학", "금융자산", "분류", "측정", "OCI"],
  },
  {
    id: "first-accounting-liabilities",
    mode: "first",
    subject: "회계학",
    unit: "부채",
    topic: "충당부채",
    examSkill: "인식요건 판단",
    commonMistakeTypes: ["우발부채와 혼동", "인식시점 오판"],
    retrievalCue: "충당부채 인식요건 3요소를 사례에 적용해보세요.",
    tags: ["회계학", "부채", "충당부채", "인식요건"],
  },
  {
    id: "first-accounting-cost-basics",
    mode: "first",
    subject: "회계학",
    unit: "원가/관리회계 기초",
    topic: "원가배분",
    examSkill: "배부기준 선택",
    commonMistakeTypes: ["고정/변동원가 구분 오류", "배부기준 선택 오류"],
    retrievalCue: "원가배분 기준 선택 이유를 숫자와 함께 설명해보세요.",
    tags: ["회계학", "원가회계", "관리회계", "원가배분", "고정원가", "변동원가"],
  },

  // 2차 - 감정평가실무
  {
    id: "second-practice-method-selection",
    mode: "second",
    subject: "감정평가실무",
    unit: "평가방법 선택",
    topic: "방법 적용 판단",
    examSkill: "방법선택 논증",
    commonMistakeTypes: ["대상물 특성 미반영", "방법 선택 근거 부족"],
    retrievalCue: "사안별 평가방법 선택 근거를 2문장으로 제시해보세요.",
    tags: ["감정평가실무", "평가방법 선택", "논증", "대상물"],
  },
  {
    id: "second-practice-adjustment",
    mode: "second",
    subject: "감정평가실무",
    unit: "보정",
    topic: "개별요인 보정",
    examSkill: "보정근거 제시",
    commonMistakeTypes: ["보정항목 누락", "보정률 근거 부족"],
    retrievalCue: "개별요인 보정 항목과 근거를 짧게 서술해보세요.",
    tags: ["감정평가실무", "보정", "개별요인", "보정률"],
  },
  {
    id: "second-practice-income-approach",
    mode: "second",
    subject: "감정평가실무",
    unit: "수익방식",
    topic: "환원/할인",
    examSkill: "수익가치 산정",
    commonMistakeTypes: ["현금흐름 가정 불명확", "환원율 적용 오류"],
    retrievalCue: "수익방식 적용 시 핵심 가정과 계산 흐름을 정리해보세요.",
    tags: ["감정평가실무", "수익방식", "환원", "할인", "현금흐름"],
  },
  {
    id: "second-practice-cost-approach",
    mode: "second",
    subject: "감정평가실무",
    unit: "원가방식",
    topic: "재조달원가와 감가수정",
    examSkill: "원가항목 구성",
    commonMistakeTypes: ["감가요인 누락", "재조달원가 산정 오류"],
    retrievalCue: "원가방식에서 재조달원가-감가수정 흐름을 설명해보세요.",
    tags: ["감정평가실무", "원가방식", "재조달원가", "감가수정"],
  },
  {
    id: "second-practice-sales-comparison",
    mode: "second",
    subject: "감정평가실무",
    unit: "비교방식",
    topic: "사례비교법",
    examSkill: "사례선정/비교",
    commonMistakeTypes: ["사례 유사성 검토 부족", "비교항목 누락"],
    retrievalCue: "비교방식에서 사례 선정 기준을 먼저 제시해보세요.",
    tags: ["감정평가실무", "비교방식", "사례비교법", "사례선정"],
  },
  {
    id: "second-practice-final-value",
    mode: "second",
    subject: "감정평가실무",
    unit: "결론 수치",
    topic: "시산가액 조정",
    examSkill: "결론 정합성 검토",
    commonMistakeTypes: ["시산가액 조정근거 부족", "결론-근거 불일치"],
    retrievalCue: "결론 수치 도출 시 조정 논리를 짧게 구조화해보세요.",
    tags: ["감정평가실무", "결론 수치", "시산가액", "조정"],
  },

  // 2차 - 감정평가이론
  {
    id: "second-theory-value-theory",
    mode: "second",
    subject: "감정평가이론",
    unit: "가치이론",
    topic: "가치개념 구분",
    examSkill: "개념 정합성",
    commonMistakeTypes: ["가치개념 혼용", "정의 반복형 서술"],
    retrievalCue: "가치이론의 핵심 개념 2개를 대비하여 설명해보세요.",
    tags: ["감정평가이론", "가치이론", "가치개념", "정의"],
  },
  {
    id: "second-theory-price-principle",
    mode: "second",
    subject: "감정평가이론",
    unit: "가격원칙",
    topic: "가격형성 원칙",
    examSkill: "원칙 적용",
    commonMistakeTypes: ["원칙 열거만 수행", "사안 연결 부족"],
    retrievalCue: "가격원칙을 실제 시장사례와 연결해 3문장으로 서술해보세요.",
    tags: ["감정평가이론", "가격원칙", "가격형성", "사안연결"],
  },
  {
    id: "second-theory-approach-logic",
    mode: "second",
    subject: "감정평가이론",
    unit: "평가방식 논리",
    topic: "방식 간 정합성",
    examSkill: "논리 전개",
    commonMistakeTypes: ["방식별 전제 누락", "논리 비약"],
    retrievalCue: "평가방식별 전제와 한계를 비교해 논리 흐름을 만들어보세요.",
    tags: ["감정평가이론", "평가방식", "논리", "정합성"],
  },
  {
    id: "second-theory-market-analysis",
    mode: "second",
    subject: "감정평가이론",
    unit: "시장분석",
    topic: "시장자료 해석",
    examSkill: "자료기반 주장",
    commonMistakeTypes: ["자료 인용 누락", "시장요인 단편 해석"],
    retrievalCue: "시장분석 답안에서 수요·공급·거래사례를 어떻게 연결할지 말해보세요.",
    tags: ["감정평가이론", "시장분석", "시장자료", "수요", "공급"],
  },
  {
    id: "second-theory-highest-best-use",
    mode: "second",
    subject: "감정평가이론",
    unit: "최고최선이용",
    topic: "법적·물리적·경제적 검토",
    examSkill: "판단기준 적용",
    commonMistakeTypes: ["검토순서 혼동", "실현가능성 검토 누락"],
    retrievalCue: "최고최선이용 판단의 4가지 기준을 순서대로 적용해보세요.",
    tags: ["감정평가이론", "최고최선이용", "법적", "물리적", "경제적"],
  },

  // 2차 - 감정평가 및 보상법규
  {
    id: "second-comp-law-requirements",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "요건",
    topic: "공익사업 요건",
    examSkill: "요건식별",
    commonMistakeTypes: ["필수요건 누락", "요건 충족 판단 근거 부족"],
    retrievalCue: "공익사업 관련 핵심 요건을 조문 기준으로 정리해보세요.",
    tags: ["감정평가 및 보상법규", "요건", "공익사업", "조문"],
  },
  {
    id: "second-comp-law-statute",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "조문",
    topic: "핵심 조문 구조",
    examSkill: "조문인용 정확도",
    commonMistakeTypes: ["조문 번호 혼동", "요건-효과 연결 누락"],
    retrievalCue: "핵심 조문을 요건/효과 구조로 압축해 말해보세요.",
    tags: ["감정평가 및 보상법규", "조문", "요건", "효과"],
  },
  {
    id: "second-comp-law-procedure-project-approval",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "절차",
    topic: "사업인정",
    subtopic: "절차",
    examSkill: "절차 단계 서술",
    commonMistakeTypes: ["절차 선후 누락", "주체별 권한 혼동"],
    retrievalCue: "사업인정 절차를 단계/주체/효과로 나눠 서술해보세요.",
    tags: ["감정평가 및 보상법규", "절차", "사업인정", "주체", "단계"],
  },
  {
    id: "second-comp-law-precedent-principles",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "판례/법리",
    topic: "쟁점별 판례법리",
    examSkill: "판례 적용",
    commonMistakeTypes: ["사실관계와 법리 분리 실패", "판례 취지 오독"],
    retrievalCue: "판례 법리를 사안사실에 맞춰 2단계로 적용해보세요.",
    tags: ["감정평가 및 보상법규", "판례", "법리", "적용"],
  },
  {
    id: "second-comp-law-issue-subsumption",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "사안포섭",
    topic: "쟁점 구조화",
    examSkill: "포섭 논증",
    commonMistakeTypes: ["쟁점 누락", "규범-사실 연결 부족"],
    retrievalCue: "사안포섭 시 규범→사실→결론 순서로 짧게 써보세요.",
    tags: ["감정평가 및 보상법규", "사안포섭", "쟁점", "논증"],
  },
  {
    id: "second-comp-law-conclusion",
    mode: "second",
    subject: "감정평가 및 보상법규",
    unit: "결론",
    topic: "최종 결론 구성",
    examSkill: "결론 압축",
    commonMistakeTypes: ["근거 없는 단정", "주문형 결론 누락"],
    retrievalCue: "결론 문단을 쟁점별 한 줄 결론 형태로 재작성해보세요.",
    tags: ["감정평가 및 보상법규", "결론", "최종결론", "쟁점별"],
  },
];

export function listTaxonomyNodes(mode?: AppraisalMode): AppraisalTaxonomyNode[] {
  if (!mode) {
    return APPRAISAL_TAXONOMY_NODES;
  }

  return APPRAISAL_TAXONOMY_NODES.filter((node) => node.mode === mode);
}

export function listTaxonomyBySubject(
  mode: AppraisalMode,
  subject: string,
): AppraisalTaxonomyNode[] {
  const normalizedSubject = normalize(subject);

  return APPRAISAL_TAXONOMY_NODES.filter(
    (node) => node.mode === mode && normalize(node.subject) === normalizedSubject,
  );
}

export function findTaxonomyNodeById(id: string): AppraisalTaxonomyNode | undefined {
  const normalizedId = normalize(id);
  return APPRAISAL_TAXONOMY_NODES.find((node) => normalize(node.id) === normalizedId);
}

export function searchTaxonomyCandidates(
  input: TaxonomySearchInput,
): TaxonomySearchCandidate[] {
  const query = normalize(input.text);
  const queryTokens = tokenize(input.text);
  const subjectFilter = input.subject ? normalize(input.subject) : undefined;

  const scoped = APPRAISAL_TAXONOMY_NODES.filter(
    (node) =>
      node.mode === input.mode &&
      (!subjectFilter || normalize(node.subject) === subjectFilter),
  );

  const ranked = scoped
    .map((node) => {
      const keywordPool = [
        node.subject,
        node.unit,
        node.topic,
        node.subtopic,
        node.examSkill,
        ...node.commonMistakeTypes,
        ...node.tags,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => normalize(value));

      const matched = new Set<string>();
      let score = 0;

      for (const keyword of keywordPool) {
        if (!keyword) {
          continue;
        }

        if (query.includes(keyword)) {
          score += keyword.length >= 4 ? 4 : 3;
          matched.add(keyword);
        }
      }

      for (const token of queryTokens) {
        if (!token || token.length < 2) {
          continue;
        }

        if (keywordPool.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
          score += token.length >= 3 ? 2 : 1;
          matched.add(token);
        }
      }

      if (query.includes(normalize(node.subject))) {
        score += 3;
      }

      if (query.includes(normalize(node.unit))) {
        score += 2;
      }

      return {
        node,
        score,
        matchedKeywords: Array.from(matched),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.node.id.localeCompare(b.node.id);
    });

  return ranked;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,./|\-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}
