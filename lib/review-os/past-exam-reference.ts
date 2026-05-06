export type PastExamStage = "first" | "second";
export type SourceStatus = "verified" | "needs_review";

export type PastExamReferenceItem = {
  id: string;
  exam_year: number;
  exam_name: string;
  stage: PastExamStage;
  subject: string;
  question_number: number;
  question_type: string;
  topic_tags: string[];
  issue_tags: string[];
  skill_tags: string[];
  expected_answer_skeleton: string[];
  scoring_checkpoint_skeleton: string[];
  common_gap_candidates: string[];
  related_mistake_types: string[];
  similar_question_refs: string[];
  source_status: SourceStatus;
  raw_text_policy: "reference_only";
};

export type ReferenceLookupMode = PastExamStage | "all";

export type PastExamCandidateInput = {
  mode?: PastExamStage | null;
  subject?: string | null;
  topicCandidate?: string | null;
  mistakeType?: string | null;
  weakStructurePoint?: string | null;
};

export type PastExamReferenceMatch = {
  reference: PastExamReferenceItem;
  score: number;
  matched_fields: Array<
    | "subject"
    | "topic_candidate"
    | "mistake_type"
    | "weak_structure_point"
    | "issue_tags"
    | "skill_tags"
    | "skeleton"
  >;
  reason: string;
};

export type AnswerSkeletonGuide = {
  referenceId: string;
  title: string;
  skeleton_steps: string[];
  checkpoint_questions: string[];
  common_gap_warnings: string[];
  next_action: string;
};

const PAST_EXAM_REFERENCES: PastExamReferenceItem[] = [
  {
    id: "appraiser-second-2020-31-practice-q1",
    exam_year: 2020,
    exam_name: "제31회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "조건 보정"],
    issue_tags: ["전제 조건 누락", "근거-수치 연결 부족"],
    skill_tags: ["조건 점검", "근거 제시", "계산 검증"],
    expected_answer_skeleton: ["문제 요구", "조건 정리", "평가 근거", "계산 검토", "결론"],
    scoring_checkpoint_skeleton: ["전제·조건 명시", "근거와 수치 연결", "결론 수치·단위 일치"],
    common_gap_candidates: ["조건 정리 없이 계산부터 시작", "결론 수치 근거 문장 누락"],
    related_mistake_types: ["조건 누락", "계산 실수", "구조 약함"],
    similar_question_refs: ["appraiser-second-2021-32-practice-q1", "appraiser-second-2022-33-practice-q1"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2020-31-theory-q2",
    exam_year: 2020,
    exam_name: "제31회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["비교 기준 불명확", "적용 결론 누락"],
    skill_tags: ["쟁점 정리", "논거 계층화", "적용 문장화"],
    expected_answer_skeleton: ["쟁점 정의", "비교 기준", "핵심 논거", "사례 적용", "결론"],
    scoring_checkpoint_skeleton: ["비교 축 명시", "논거의 순차성", "적용-결론 연결"],
    common_gap_candidates: ["정의 나열 후 기준 제시 누락", "적용 없이 추상 결론"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2021-32-theory-q2", "appraiser-second-2022-33-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2020-31-law-q3",
    exam_year: 2020,
    exam_name: "제31회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 사실대응 누락", "절차 단계 비약"],
    skill_tags: ["요건 분해", "조문 근거", "포섭 결론"],
    expected_answer_skeleton: ["쟁점 도출", "요건 정리", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 사실 대응", "조문/법리 근거", "포섭과 결론의 일치"],
    common_gap_candidates: ["요건 열거 후 사실 연결 누락", "조문 근거 없이 결론 제시"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2021-32-law-q3", "appraiser-second-2022-33-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2019-30-practice-q1",
    exam_year: 2019,
    exam_name: "제30회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "시점수정"],
    issue_tags: ["시점 보정 누락", "조건 정리 부족"],
    skill_tags: ["조건 재정의", "근거-계산 연결", "결론 정렬"],
    expected_answer_skeleton: ["문제 요구", "전제 조건", "평가 근거", "계산 흐름", "결론"],
    scoring_checkpoint_skeleton: ["조건·시점 명시", "근거와 계산 연결", "결론 수치 검증"],
    common_gap_candidates: ["시점 기준 없이 수치 계산", "검증 없이 결론 확정"],
    related_mistake_types: ["조건 누락", "계산 실수", "시간 배분 실패"],
    similar_question_refs: ["appraiser-second-2020-31-practice-q1", "appraiser-second-2021-32-practice-q1"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2019-30-theory-q2",
    exam_year: 2019,
    exam_name: "제30회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["논거 우선순위 누락", "사례 연결 약함"],
    skill_tags: ["쟁점 대비", "논리 전개", "적용 결론"],
    expected_answer_skeleton: ["쟁점 정의", "핵심 기준", "논거 전개", "사례 적용", "정리 결론"],
    scoring_checkpoint_skeleton: ["핵심 기준 선명성", "논거의 계층", "적용 결론 문장"],
    common_gap_candidates: ["기준 없이 쟁점만 나열", "적용 없이 결론 반복"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2020-31-theory-q2", "appraiser-second-2021-32-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2019-30-law-q3",
    exam_year: 2019,
    exam_name: "제30회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 검토 누락", "포섭 결론 근거 부족"],
    skill_tags: ["조문 구조화", "요건 판단", "사안 연결"],
    expected_answer_skeleton: ["쟁점 도출", "요건 분해", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 사실 기재", "조문 근거 명시", "결론 범위 명확성"],
    common_gap_candidates: ["사실관계와 요건 대응 누락", "절차 생략 후 결론 도출"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2020-31-law-q3", "appraiser-second-2021-32-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2022-33-practice-q1",
    exam_year: 2022,
    exam_name: "제33회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "개별요인"],
    issue_tags: ["개별요인 반영 누락", "근거-수치 연결 부족"],
    skill_tags: ["조건 점검", "근거 제시", "계산 검증"],
    expected_answer_skeleton: ["문제 요구", "조건 정리", "평가 근거", "계산 검토", "결론"],
    scoring_checkpoint_skeleton: ["조건과 전제 명시", "근거와 수치 연결", "결론 수치·단위 일치"],
    common_gap_candidates: ["전제 조건 없이 계산 먼저 제시", "결론 수치 근거 문장 누락"],
    related_mistake_types: ["조건 누락", "계산 실수", "구조 약함"],
    similar_question_refs: ["appraiser-second-2023-34-practice-q1", "appraiser-second-2024-35-practice-q1"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2022-33-theory-q2",
    exam_year: 2022,
    exam_name: "제33회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["개념 대비 축 불명확", "적용 결론 누락"],
    skill_tags: ["쟁점 정리", "논거 계층화", "적용 문장화"],
    expected_answer_skeleton: ["쟁점 정의", "비교 기준", "핵심 논거", "사례 적용", "결론"],
    scoring_checkpoint_skeleton: ["비교 기준 명시", "논거의 순차성", "적용-결론 연결"],
    common_gap_candidates: ["정의 나열 후 기준 제시 누락", "사례 문장 없이 추상 결론"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2023-34-theory-q2", "appraiser-second-2024-35-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2022-33-law-q3",
    exam_year: 2022,
    exam_name: "제33회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 사실대응 누락", "절차 단계 비약"],
    skill_tags: ["요건 분해", "조문 근거", "포섭 결론"],
    expected_answer_skeleton: ["쟁점 도출", "요건 정리", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 사실 대응", "조문/법리 근거", "포섭과 결론의 일치"],
    common_gap_candidates: ["요건만 열거하고 사실 연결 누락", "조문 기재 없이 결론만 제시"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2023-34-law-q3", "appraiser-second-2024-35-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2021-32-practice-q1",
    exam_year: 2021,
    exam_name: "제32회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "시점수정"],
    issue_tags: ["시점 보정 누락", "조건 정리 부족"],
    skill_tags: ["조건 재정의", "근거-계산 연결", "결론 정렬"],
    expected_answer_skeleton: ["문제 요구", "전제 조건", "평가 근거", "계산 흐름", "결론"],
    scoring_checkpoint_skeleton: ["조건·시점 명시", "근거와 계산 연결", "결론 수치 검증"],
    common_gap_candidates: ["시점 기준 없이 수치 계산", "검증 없이 결론 확정"],
    related_mistake_types: ["조건 누락", "계산 실수", "시간 배분 실패"],
    similar_question_refs: ["appraiser-second-2022-33-practice-q1", "appraiser-second-2025-36-practice-q1"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2021-32-theory-q2",
    exam_year: 2021,
    exam_name: "제32회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["논거 우선순위 누락", "사례 연결 약함"],
    skill_tags: ["쟁점 대비", "논리 전개", "적용 결론"],
    expected_answer_skeleton: ["쟁점 정의", "핵심 기준", "논거 전개", "사례 적용", "정리 결론"],
    scoring_checkpoint_skeleton: ["핵심 기준 선명성", "논거의 계층", "적용 결론 문장"],
    common_gap_candidates: ["기준 없이 쟁점만 나열", "적용 없이 결론 반복"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2022-33-theory-q2", "appraiser-second-2025-36-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2021-32-law-q3",
    exam_year: 2021,
    exam_name: "제32회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 검토 누락", "포섭 결론 근거 부족"],
    skill_tags: ["조문 구조화", "요건 판단", "사안 연결"],
    expected_answer_skeleton: ["쟁점 도출", "요건 분해", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 사실 기재", "조문 근거 명시", "결론 범위 명확성"],
    common_gap_candidates: ["사실관계와 요건 대응 누락", "절차 생략 후 결론 도출"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2022-33-law-q3", "appraiser-second-2025-36-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2024-35-practice-q1",
    exam_year: 2024,
    exam_name: "제35회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "조건 보정"],
    issue_tags: ["조건 정리 누락", "수치-서술 불일치"],
    skill_tags: ["조건 재정의", "근거-계산 연결", "결론 정렬"],
    expected_answer_skeleton: ["문제 요구", "조건 정리", "평가 근거", "계산 흐름", "결론"],
    scoring_checkpoint_skeleton: ["조건 재기재", "근거와 계산의 연결", "결론 수치·단위 일치"],
    common_gap_candidates: ["조건 표기 없이 계산 시작", "결론 수치와 본문 계산 불일치"],
    related_mistake_types: ["조건 누락", "계산 실수", "구조 약함"],
    similar_question_refs: ["appraiser-second-2025-36-practice-q1", "appraiser-second-2024-35-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2024-35-theory-q2",
    exam_year: 2024,
    exam_name: "제35회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["개념 대비 부족", "적용 문장 누락"],
    skill_tags: ["쟁점 대비", "논거 계층화", "적용 결론"],
    expected_answer_skeleton: ["쟁점 정의", "비교 기준", "핵심 논거", "사례 적용", "정리 결론"],
    scoring_checkpoint_skeleton: ["비교 축 명시", "논거 간 우선순위", "적용 문장 존재"],
    common_gap_candidates: ["정의만 쓰고 비교 기준 생략", "사례 적용 없이 결론만 제시"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2025-36-theory-q2", "appraiser-second-2024-35-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2024-35-law-q3",
    exam_year: 2024,
    exam_name: "제35회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 단계 누락", "절차 순서 비약"],
    skill_tags: ["요건 분해", "조문 근거", "사안 연결"],
    expected_answer_skeleton: ["쟁점 도출", "요건 분해", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 사실 대응", "조문 근거 기재", "결론의 범위 명확성"],
    common_gap_candidates: ["요건 일부만 검토", "조문 인용 없이 포섭"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2025-36-law-q3", "appraiser-second-2024-35-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2023-34-practice-q1",
    exam_year: 2023,
    exam_name: "제34회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "시점수정"],
    issue_tags: ["전제 조건 누락", "시점 적용 누락"],
    skill_tags: ["조건 점검", "근거 제시", "수치 검증"],
    expected_answer_skeleton: ["문제 요구", "전제 조건", "평가 근거", "계산 검증", "결론"],
    scoring_checkpoint_skeleton: ["조건 표기", "근거 문장", "검증 계산", "최종 수치 일치"],
    common_gap_candidates: ["전제 조건 미기재", "검증 계산 없이 결론 제시"],
    related_mistake_types: ["조건 누락", "계산 실수", "시간 배분 실패"],
    similar_question_refs: ["appraiser-second-2024-35-practice-q1", "appraiser-second-2025-36-practice-q1"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2023-34-theory-q2",
    exam_year: 2023,
    exam_name: "제34회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["정의-논거 분리", "적용 근거 부족"],
    skill_tags: ["핵심어 정렬", "논리 전개", "적용 문장화"],
    expected_answer_skeleton: ["쟁점 정의", "핵심 기준", "논거 전개", "사례 적용", "결론"],
    scoring_checkpoint_skeleton: ["핵심 기준 명시", "논거의 순차성", "적용 근거 문장"],
    common_gap_candidates: ["핵심 기준 없이 정의만 제시", "사례 적용 생략"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2024-35-theory-q2", "appraiser-second-2025-36-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2023-34-law-q3",
    exam_year: 2023,
    exam_name: "제34회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 판단 근거 부족", "절차 연결 누락"],
    skill_tags: ["조문 구조화", "요건 판단", "포섭 결론"],
    expected_answer_skeleton: ["쟁점 도출", "요건 정리", "조문/법리", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건별 검토", "조문 인용", "포섭-결론 연결"],
    common_gap_candidates: ["요건만 나열하고 사실 연결 누락", "절차 정리 없이 결론 도출"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2024-35-law-q3", "appraiser-second-2025-36-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2025-36-practice-q1",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가실무",
    question_number: 1,
    question_type: "사례형",
    topic_tags: ["평가방법", "자료검토", "시점수정"],
    issue_tags: ["평가근거 누락", "시점·단위 혼동"],
    skill_tags: ["근거 제시", "계산 검토", "결론 수치 명시"],
    expected_answer_skeleton: ["문제 요구", "평가 근거", "계산 흐름", "결론"],
    scoring_checkpoint_skeleton: ["평가방법 선택 근거", "자료 적정성 점검", "수치·단위 일치"],
    common_gap_candidates: ["근거 문장 없이 계산", "결론 수치 미기재"],
    related_mistake_types: ["조건 누락", "계산 실수", "구조 약함"],
    similar_question_refs: ["appraiser-second-2025-36-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2025-36-theory-q2",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가이론",
    question_number: 2,
    question_type: "논술형",
    topic_tags: ["개념정의", "논거연결", "사례적용"],
    issue_tags: ["정의-사례 연결 부족", "결론 추상화"],
    skill_tags: ["쟁점 정리", "사례 포섭", "문단 구조"],
    expected_answer_skeleton: ["정의", "핵심 논거", "사례 적용", "결론"],
    scoring_checkpoint_skeleton: ["핵심 개념 정확성", "논거 연결", "사례 문장 존재"],
    common_gap_candidates: ["정의 나열 후 적용 누락", "결론만 반복"],
    related_mistake_types: ["개념 혼동", "판례/논점 적용 부족", "구조 약함"],
    similar_question_refs: ["appraiser-second-2025-36-law-q3"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
  {
    id: "appraiser-second-2025-36-law-q3",
    exam_year: 2025,
    exam_name: "제36회 감정평가사 2차",
    stage: "second",
    subject: "감정평가 및 보상법규",
    question_number: 3,
    question_type: "사례형",
    topic_tags: ["요건", "절차", "사안포섭"],
    issue_tags: ["요건 누락", "절차 순서 혼동"],
    skill_tags: ["조문 연결", "절차 배열", "포섭 문장"],
    expected_answer_skeleton: ["요건", "조문/법리", "절차", "사안 포섭", "결론"],
    scoring_checkpoint_skeleton: ["요건 식별", "조문/법리 근거", "사안 포섭의 명시성"],
    common_gap_candidates: ["조문 없는 포섭", "절차 생략"],
    related_mistake_types: ["조건 누락", "판례/논점 적용 부족", "암기 누락"],
    similar_question_refs: ["appraiser-second-2025-36-theory-q2"],
    source_status: "needs_review",
    raw_text_policy: "reference_only",
  },
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchAnyTag(haystack: string[], needle: string) {
  if (!needle) return false;
  return haystack.some((tag) => normalize(tag).includes(needle) || needle.includes(normalize(tag)));
}

export function listPastExamReferences(mode: ReferenceLookupMode = "all", subject?: string | null): PastExamReferenceItem[] {
  const normalizedSubject = normalize(subject);
  return PAST_EXAM_REFERENCES.filter((item) => {
    if (mode !== "all" && item.stage !== mode) return false;
    if (normalizedSubject && normalize(item.subject) !== normalizedSubject) return false;
    return true;
  });
}

export function findPastExamReferenceCandidates(input: PastExamCandidateInput): PastExamReferenceItem[] {
  return findPastExamReferenceMatches(input).map((match) => match.reference);
}

export function findPastExamReferenceMatches(input: PastExamCandidateInput): PastExamReferenceMatch[] {
  const mode = input.mode ?? null;
  const subject = normalize(input.subject);
  const topicCandidate = normalize(input.topicCandidate);
  const mistakeType = normalize(input.mistakeType);
  const weakStructurePoint = normalize(input.weakStructurePoint);

  const candidates = PAST_EXAM_REFERENCES.map((item): PastExamReferenceMatch | null => {
    if (mode && item.stage !== mode) return null;
    const matched_fields: PastExamReferenceMatch["matched_fields"] = [];
    let score = 0;

    if (subject && normalize(item.subject) === subject) {
      matched_fields.push("subject");
      score += 4;
    } else if (subject) {
      return null;
    }

    const matchedTopic = matchAnyTag(item.topic_tags, topicCandidate);
    const matchedMistake = matchAnyTag(item.related_mistake_types, mistakeType);
    const matchedStructure = matchAnyTag([...item.expected_answer_skeleton, ...item.scoring_checkpoint_skeleton], weakStructurePoint);
    const matchedIssueTag = matchAnyTag(item.issue_tags, topicCandidate);
    const matchedSkillTag = matchAnyTag(item.skill_tags, topicCandidate);

    if (matchedTopic) {
      matched_fields.push("topic_candidate");
      score += 3;
    }

    if (matchedMistake) {
      matched_fields.push("mistake_type");
      score += 3;
    }

    if (matchedStructure) {
      matched_fields.push("weak_structure_point", "skeleton");
      score += 2;
    }

    if (matchedIssueTag) {
      matched_fields.push("issue_tags");
      score += 1;
    }

    if (matchedSkillTag) {
      matched_fields.push("skill_tags");
      score += 1;
    }

    if (!matchedTopic && !matchedMistake && !matchedStructure && !matchedIssueTag && !matchedSkillTag) {
      return null;
    }

    const uniqueMatchedFields = [...new Set(matched_fields)];
    let reason = "논점 후보와 오류 유형이 함께 연결됩니다.";
    if (matchedTopic && matchedMistake) {
      reason = "논점 후보와 오류 유형이 함께 연결됩니다.";
    } else if (matchedTopic) {
      reason = "과목과 논점 후보가 유사합니다.";
    } else if (matchedMistake) {
      reason = "오류 유형이 이 기출의 공통 누락 포인트와 가깝습니다.";
    } else if (matchedStructure) {
      reason = "구조 약점이 이 기출의 체크포인트와 연결됩니다.";
    }

    return {
      reference: item,
      score,
      matched_fields: uniqueMatchedFields,
      reason,
    };
  }).filter((item): item is PastExamReferenceMatch => Boolean(item));

  return candidates
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.reference.exam_year - a.reference.exam_year ||
        a.reference.id.localeCompare(b.reference.id),
    )
    .slice(0, 3);
}

export function mapCaptureNoteToPastExamReferences(captureNoteSignals: Record<string, unknown>): PastExamReferenceItem[] {
  return findPastExamReferenceCandidates({
    mode: captureNoteSignals.mode === "second" || captureNoteSignals.mode === "first" ? (captureNoteSignals.mode as PastExamStage) : null,
    subject: typeof captureNoteSignals.subject === "string" ? captureNoteSignals.subject : null,
    topicCandidate: typeof captureNoteSignals.topic_candidate === "string" ? captureNoteSignals.topic_candidate : null,
    mistakeType: typeof captureNoteSignals.mistake_type === "string" ? captureNoteSignals.mistake_type : null,
    weakStructurePoint: typeof captureNoteSignals.weak_structure_point === "string" ? captureNoteSignals.weak_structure_point : null,
  });
}

export function mapCaptureNoteToPastExamReferenceMatches(
  captureNoteSignals: Record<string, unknown>
): PastExamReferenceMatch[] {
  return findPastExamReferenceMatches({
    mode: captureNoteSignals.mode === "second" || captureNoteSignals.mode === "first" ? (captureNoteSignals.mode as PastExamStage) : null,
    subject: typeof captureNoteSignals.subject === "string" ? captureNoteSignals.subject : null,
    topicCandidate: typeof captureNoteSignals.topic_candidate === "string" ? captureNoteSignals.topic_candidate : null,
    mistakeType: typeof captureNoteSignals.mistake_type === "string" ? captureNoteSignals.mistake_type : null,
    weakStructurePoint: typeof captureNoteSignals.weak_structure_point === "string" ? captureNoteSignals.weak_structure_point : null,
  });
}

export function buildAnswerSkeletonGuide(reference: PastExamReferenceItem): AnswerSkeletonGuide {
  const title = `${reference.exam_year} ${reference.subject} ${reference.question_number}번 학습용 답안 skeleton`;
  return {
    referenceId: reference.id,
    title,
    skeleton_steps: reference.expected_answer_skeleton.map((step, index) => `${index + 1}. ${step} 문장 1개 작성`),
    checkpoint_questions: reference.scoring_checkpoint_skeleton.map((checkpoint) => `${checkpoint}가 내 문장에 보이는가?`),
    common_gap_warnings: reference.common_gap_candidates.map((gap) => `주의: ${gap}`),
    next_action: "지금 3분 동안 위 순서대로 초안을 다시 쓰고, 체크포인트 질문에 스스로 답해 보세요.",
  };
}
