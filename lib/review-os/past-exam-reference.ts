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

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
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
