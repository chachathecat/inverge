import {
  getDefaultSubject,
  getModeConfig,
  isSubjectAllowedForMode,
  normalizeSubjectForMode,
  type AppraisalMode,
} from "@/lib/review-os/appraisal";
import { resolveReviewSchedule } from "@/lib/review-os/scheduling";

export type FirstExtractionDraft = {
  subject_guess: string;
  problem_title: string;
  source_label: string;
  question_summary: string;
  correct_answer: string;
  user_answer: string;
  wrong_reason_candidate: string;
  key_concepts: string[];
  core_formula: string;
  comparison_point: string;
  review_date_suggestion: string;
  needs_review: boolean;
};

export type SecondExtractionDraft = {
  subject_guess: string;
  case_title: string;
  case_summary: string;
  reference_outline: string;
  user_answer_summary: string;
  missing_issue: string;
  weak_sentence: string;
  weak_structure_point: string;
  rewrite_instruction: string;
  review_date_suggestion: string;
  needs_review: boolean;
};

export type ExtractionDraft = FirstExtractionDraft | SecondExtractionDraft;

export type ExtractionPipelineResult = {
  mode: AppraisalMode;
  raw_ocr_text: string;
  raw_extraction_json: Record<string, unknown>;
  normalized_draft: ExtractionDraft;
};

const UNKNOWN = "unknown";

function nextReviewDate(mode: AppraisalMode) {
  const schedule = resolveReviewSchedule({
    mode,
    isCorrect: false,
    confidence: "중간",
    mistakeType: "개념 혼동",
    hasWeakParagraph: mode === "second",
  });
  return schedule.nextReviewDate;
}

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function firstNonEmpty(lines: string[], fallback = UNKNOWN) {
  return lines.map(clean).find(Boolean)?.slice(0, 80) ?? fallback;
}

function extractField(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:：=>-]\\s*([^\\n]+)`, "i"));
    if (match?.[1]) return clean(match[1]).slice(0, 120);
  }
  return UNKNOWN;
}

function extractConcepts(text: string) {
  const candidates = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map(clean)
    .filter((word) => word.length >= 2 && word.length <= 12 && !/^\d+$/.test(word));
  return Array.from(new Set(candidates)).slice(0, 3);
}

function inferReason(text: string) {
  const labels = ["조건 누락", "개념 혼동", "계산 실수", "구조 약함", "시간 부족", "암기 누락", "논점 적용 부족"];
  const direct = labels.find((label) => text.includes(label));
  if (direct) return direct;
  if (/헷갈|혼동|구분/.test(text)) return "개념 혼동";
  if (/계산|산식|분개|금액/.test(text)) return "계산 실수";
  if (/시간|초과/.test(text)) return "시간 부족";
  if (/누락|빠뜨/.test(text)) return "조건 누락";
  return UNKNOWN;
}

function inferFormula(text: string) {
  const formulaLine = text
    .split(/\r?\n/)
    .map(clean)
    .find((line) => /공식|식|=|→|->/.test(line));
  return formulaLine ?? UNKNOWN;
}

function inferSecondUserAnswerSummary(text: string) {
  return extractField(text, ["내 답안", "내 답", "사용자 답안", "my answer"]);
}

function inferWeakStructurePoint(text: string, missingIssue: string) {
  if (missingIssue !== UNKNOWN && /근거|구조|목차|논점|요건/.test(missingIssue)) return missingIssue;
  if (/근거\s*(없이|누락)|근거가\s*없/.test(text)) return "평가 근거 제시 약함";
  if (/목차|구조|순서/.test(text)) return "답안 구조 정리 필요";
  if (/논점.*누락|누락.*논점/.test(text)) return "누락 논점 보강 필요";
  return UNKNOWN;
}

function inferWeakSentence(text: string, missingIssue: string, weakStructurePoint: string) {
  const evidence = `${text} ${missingIssue} ${weakStructurePoint}`;
  if (/근거/.test(evidence)) return "평가 근거를 먼저 제시한 뒤 계산이나 결론으로 연결하세요.";
  if (/요건|조문|법리/.test(evidence)) return "요건 충족 여부를 사안 사실과 직접 연결하세요.";
  if (/정의|개념/.test(evidence)) return "정의 뒤에 사례 사실관계를 적용하는 문장을 붙이세요.";
  if (/목차|구조|순서/.test(evidence)) return "문제 요구, 논점, 적용, 결론 순서로 문장을 다시 배치하세요.";
  return UNKNOWN;
}

function inferRewriteInstruction(missingIssue: string, weakStructurePoint: string) {
  const target = missingIssue !== UNKNOWN ? missingIssue : weakStructurePoint;
  return target !== UNKNOWN ? `다음 rewrite에서 ${target}을 먼저 제시하세요.` : UNKNOWN;
}

function subjectGuess(text: string, mode: AppraisalMode) {
  const subjects = getModeConfig(mode).subjects;
  return subjects.find((subject) => text.includes(subject)) ?? UNKNOWN;
}

function normalizedSubjectGuess(value: unknown, mode: AppraisalMode) {
  if (typeof value !== "string") return UNKNOWN;
  return isSubjectAllowedForMode(value, mode) ? value : UNKNOWN;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? clean(value) : UNKNOWN;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
}

export function normalizeExtractionDraft(
  mode: AppraisalMode,
  rawText: string,
  rawJson: Record<string, unknown> = {},
  sourceLabel = "",
): ExtractionPipelineResult {
  const text = rawText.trim();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const guessedSubject = normalizedSubjectGuess(rawJson.subject_guess, mode);
  const fallbackSubject = subjectGuess(text, mode);
  const subject = guessedSubject !== UNKNOWN ? guessedSubject : fallbackSubject;
  const hasWeakSubject = subject === UNKNOWN;
  const reviewDate = getString(rawJson.review_date_suggestion);
  const review_date_suggestion = reviewDate === UNKNOWN ? nextReviewDate(mode) : reviewDate;

  if (mode === "second") {
    const caseSummary = getString(rawJson.case_summary);
    const missingIssue =
      getString(rawJson.missing_issue) !== UNKNOWN
        ? getString(rawJson.missing_issue)
        : extractField(text, ["누락 논점", "missing issue", "보강할 논점"]);
    const referenceOutline =
      getString(rawJson.reference_outline) !== UNKNOWN
        ? getString(rawJson.reference_outline)
        : extractField(text, ["기준 답안", "모범답안", "reference"]);
    const userAnswerSummary =
      getString(rawJson.user_answer_summary) !== UNKNOWN ? getString(rawJson.user_answer_summary) : inferSecondUserAnswerSummary(text);
    const weakStructurePoint =
      getString(rawJson.weak_structure_point) !== UNKNOWN ? getString(rawJson.weak_structure_point) : inferWeakStructurePoint(text, missingIssue);
    const rewriteInstruction =
      getString(rawJson.rewrite_instruction) !== UNKNOWN ? getString(rawJson.rewrite_instruction) : inferRewriteInstruction(missingIssue, weakStructurePoint);
    const rawWeakSentence = getString(rawJson.weak_sentence);
    const weakSentence = rawWeakSentence !== UNKNOWN ? rawWeakSentence : inferWeakSentence(text, missingIssue, weakStructurePoint);
    const normalized_draft: SecondExtractionDraft = {
      subject_guess: subject,
      case_title: getString(rawJson.case_title) !== UNKNOWN ? getString(rawJson.case_title) : firstNonEmpty(lines, `${normalizeSubjectForMode(subject, mode)} 답안 비교`),
      case_summary: caseSummary !== UNKNOWN ? caseSummary : firstNonEmpty(lines, UNKNOWN),
      reference_outline: referenceOutline,
      user_answer_summary: userAnswerSummary,
      missing_issue: missingIssue,
      weak_sentence: weakSentence,
      weak_structure_point: weakStructurePoint,
      rewrite_instruction: rewriteInstruction,
      review_date_suggestion,
      needs_review:
        Boolean(rawJson.needs_review) ||
        hasWeakSubject ||
        userAnswerSummary === UNKNOWN ||
        missingIssue === UNKNOWN ||
        referenceOutline === UNKNOWN ||
        rawWeakSentence === UNKNOWN ||
        weakStructurePoint === UNKNOWN,
    };
    return { mode, raw_ocr_text: rawText, raw_extraction_json: rawJson, normalized_draft };
  }

  const correctAnswer = getString(rawJson.correct_answer);
  const userAnswer = getString(rawJson.user_answer);
  const finalCorrectAnswer = correctAnswer !== UNKNOWN ? correctAnswer : extractField(text, ["정답", "correct answer"]);
  const finalUserAnswer = userAnswer !== UNKNOWN ? userAnswer : extractField(text, ["내 답", "내답", "선택", "my answer"]);
  const concepts = getStringArray(rawJson.key_concepts);
  const wrongReason = getString(rawJson.wrong_reason_candidate) !== UNKNOWN ? getString(rawJson.wrong_reason_candidate) : inferReason(text);
  const normalized_draft: FirstExtractionDraft = {
    subject_guess: subject,
    problem_title: getString(rawJson.problem_title) !== UNKNOWN ? getString(rawJson.problem_title) : firstNonEmpty(lines, `${normalizeSubjectForMode(subject, mode)} 오답 기록`),
    source_label: sourceLabel || getString(rawJson.source_label),
    question_summary: getString(rawJson.question_summary) !== UNKNOWN ? getString(rawJson.question_summary) : firstNonEmpty(lines, UNKNOWN),
    correct_answer: finalCorrectAnswer,
    user_answer: finalUserAnswer,
    wrong_reason_candidate: wrongReason,
    key_concepts: concepts.length > 0 ? concepts : extractConcepts(text),
    core_formula: getString(rawJson.core_formula) !== UNKNOWN ? getString(rawJson.core_formula) : inferFormula(text),
    comparison_point: getString(rawJson.comparison_point),
    review_date_suggestion,
    needs_review:
      Boolean(rawJson.needs_review) ||
      hasWeakSubject ||
      finalCorrectAnswer === UNKNOWN ||
      finalUserAnswer === UNKNOWN ||
      wrongReason === UNKNOWN,
  };
  return { mode, raw_ocr_text: rawText, raw_extraction_json: rawJson, normalized_draft };
}

export function buildExtractionPrompt(mode: AppraisalMode) {
  if (mode === "second") {
    return [
      "감정평가사 2차 답안 비교 자료에서 JSON만 추출하라.",
      "요약보다 schema 채우기를 우선한다. 보이지 않거나 약한 값은 unknown으로 둔다.",
      "subject_guess는 감정평가실무, 감정평가이론, 감정평가 및 보상법규 중 하나이거나 unknown이어야 한다.",
      "필드: subject_guess, case_title, case_summary, reference_outline, user_answer_summary, missing_issue, weak_sentence, weak_structure_point, rewrite_instruction, review_date_suggestion, needs_review.",
      "needs_review는 subject, missing_issue, 구조 판단이 불확실하면 true다.",
    ].join(" ");
  }

  return [
    "감정평가사 1차 오답 자료에서 JSON만 추출하라.",
    "요약보다 schema 채우기를 우선한다. 보이지 않거나 약한 값은 unknown으로 둔다.",
    "subject_guess는 민법, 경제학원론, 부동산학원론, 감정평가관계법규, 회계학 중 하나이거나 unknown이어야 한다.",
    "필드: subject_guess, problem_title, source_label, question_summary, correct_answer, user_answer, wrong_reason_candidate, key_concepts, core_formula, comparison_point, review_date_suggestion, needs_review.",
    "needs_review는 subject, 정답, 사용자 답, 틀린 이유 중 하나라도 불확실하면 true다.",
  ].join(" ");
}

export function applyDraftToConfirmedSubject(mode: AppraisalMode, subjectGuess: string) {
  return isSubjectAllowedForMode(subjectGuess, mode) ? subjectGuess : getDefaultSubject(mode);
}
