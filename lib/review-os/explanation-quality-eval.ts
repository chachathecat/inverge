import { buildLearningMetricEvent } from "./learning-metrics";
import { recordLearningMetricIfEnabled } from "./learning-metrics-sink";

export type ExplanationQualityContext = {
  examMode?: "first" | "second" | string;
  subject?: string;
  conceptLabel?: string;
  allowedLabels?: string[];
  rawTextLeakMarkers?: string[];
};

export type ExplanationQualityStatus = "pass" | "needs_revision" | "fail";

export type ExplanationQualityCheckName =
  | "hasAllFourLabels"
  | "beginnerClarity"
  | "examUsefulness"
  | "trapPointSpecificity"
  | "tenSecondCheckConvertible"
  | "noForbiddenClaims"
  | "noOfficialAnswerClaim"
  | "noScoreOrPassFail"
  | "noRawTextLeak"
  | "conciseEnough"
  | "actionOriented";

export type ExplanationQualityResult = {
  metadataOnly: true;
  status: ExplanationQualityStatus;
  score: number;
  failedChecks: ExplanationQualityCheckName[];
  warnings: string[];
  safeRevisionHints: string[];
  checks: Record<ExplanationQualityCheckName, boolean>;
};

type LadderEntry = { label?: string; text?: string };
type LadderLike = {
  conceptLabel?: string;
  subject?: string;
  examMode?: string;
  entries?: LadderEntry[];
  ladder?: Record<string, string>;
  metadataOnly?: boolean;
};

const REQUIRED_LABELS = ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"] as const;
const CHECK_NAMES: ExplanationQualityCheckName[] = [
  "hasAllFourLabels",
  "beginnerClarity",
  "examUsefulness",
  "trapPointSpecificity",
  "tenSecondCheckConvertible",
  "noForbiddenClaims",
  "noOfficialAnswerClaim",
  "noScoreOrPassFail",
  "noRawTextLeak",
  "conciseEnough",
  "actionOriented",
];

const OFFICIAL_ANSWER_PATTERNS = [
  /공식\s*(?:정답|해설|모범\s*답안|모범답안|채점)/i,
  /official\s+(?:answer|solution|grading|model\s+answer)/i,
  /model\s+answer/i,
  /최종\s*정답/i,
  /확정\s*(?:정답|모범\s*답안|모범답안)/i,
];
const SCORE_OR_PASS_FAIL_PATTERNS = [
  /\bscore\b/i,
  /pass\s*\/\s*fail/i,
  /pass\s*fail/i,
  /점수\s*(?:예측|확정|보장|판정|산출|채점)/i,
  /(?:합격|불합격)\s*(?:예측|확정|판정|보장)/i,
  /합격보장/i,
];
const FORBIDDEN_CLAIM_PATTERNS = [
  ...OFFICIAL_ANSWER_PATTERNS,
  ...SCORE_OR_PASS_FAIL_PATTERNS,
  /자동\s*채점/i,
  /AI\s*(?:최종\s*)?(?:판정|채점)/i,
];
const RAW_TEXT_PATTERNS = [
  /rawOcrText|raw_ocr_text|ocrText|problemText|questionText|rawQuestionText|userAnswerText|answerText|rawAnswerText|sourceText|copyrightedText|originalText/i,
  /다음\s+(?:중|제시문|자료)|옳은\s+것은|틀린\s+것은|정답\s*[:：]|답안\s*원문|문제\s*원문|OCR\s*원문/i,
];
const GENERIC_PATTERNS = [
  /중요한\s*개념입니다/i,
  /잘\s*이해(?:하면|해야)/i,
  /꼼꼼히\s*(?:공부|확인)/i,
  /열심히/i,
  /기본을\s*잡/i,
  /내용을\s*정리/i,
];
const SPECIFICITY_TERMS = /무효|취소|저가법|순실현가능가치|재고자산|사업인정|처분성|수익환원|순수익|환원이율|권리구제|제3자|추인|소급|원가|효과|기준|예외|반대|산식|단위|쟁점|목차|결론|정의|요건|구분|검산|회상|평가이익|평가손실|손실|높은|낮은|금액|선택|O\/X|cloze|____|빈칸/;
const ACTION_TERMS = /확인|구분|회상|다시|재시도|쓰기|검산|분리|점검|표시|고르|연결|정리|바꾸|비교|완성|채우|선택|조심|경계|O\/X|cloze|____|빈칸/;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeEntries(ladder: LadderLike): Array<{ label: string; text: string }> {
  if (Array.isArray(ladder.entries)) return ladder.entries.map((entry) => ({ label: clean(entry.label), text: clean(entry.text) }));
  if (ladder.ladder && typeof ladder.ladder === "object") {
    return Object.entries(ladder.ladder).map(([label, text]) => ({ label: clean(label), text: clean(text) }));
  }
  return [];
}

function textBundle(ladder: LadderLike, context: ExplanationQualityContext = {}) {
  const entries = normalizeEntries(ladder);
  return [ladder.conceptLabel, ladder.subject, ladder.examMode, context.conceptLabel, context.subject, context.examMode, ...entries.flatMap((entry) => [entry.label, entry.text])]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function testAny(patterns: RegExp[], value: string) {
  return patterns.some((pattern) => pattern.test(value));
}

function hasSpecificTerm(value: string, context: ExplanationQualityContext = {}) {
  const concept = clean(context.conceptLabel);
  const conceptTokens = concept.split(/[\s·/]+/).filter((token) => token.length >= 2);
  return SPECIFICITY_TERMS.test(value) || conceptTokens.some((token) => value.includes(token));
}

function hasDomainSpecificTerm(value: string, context: ExplanationQualityContext = {}) {
  const concept = clean(context.conceptLabel);
  const conceptTokens = concept.split(/[\s·/]+/).filter((token) => token.length >= 2);
  return /무효|취소|저가법|순실현가능가치|재고자산|사업인정|처분성|수익환원|순수익|환원이율|권리구제|제3자|추인|소급|원가|효과|기준|예외|반대|산식|단위|쟁점|목차|결론|정의|요건|구분|검산|평가이익|평가손실|손실|높은|낮은|금액|선택/.test(value)
    || conceptTokens.some((token) => value.includes(token));
}

function isVague(value: string) {
  const normalized = clean(value);
  if (!normalized) return true;
  if (normalized.length < 12) return true;
  if (GENERIC_PATTERNS.some((pattern) => pattern.test(normalized)) && !SPECIFICITY_TERMS.test(normalized)) return true;
  return /함정(?:입니다|이다)?$/.test(normalized) || /주의(?:하세요|해야 합니다)?$/.test(normalized);
}

export function evaluateTenSecondCheck(check: unknown, context: ExplanationQualityContext = {}): ExplanationQualityResult {
  const text = typeof check === "string" ? clean(check) : clean((check as { text?: string } | null)?.text);
  const convertible = /O\/X/.test(text) || /cloze\s*[:：]/i.test(text) || /____|빈칸/.test(text);
  const hasPromptShape = /[.?。]|다\.$|한다\.$|이다\.$|채우|확인|구분|고르|완성/.test(text);
  const safe = !testAny(FORBIDDEN_CLAIM_PATTERNS, text) && !testAny(RAW_TEXT_PATTERNS, text);
  return finalizeChecks({
    hasAllFourLabels: true,
    beginnerClarity: text.length >= 10 && !isVague(text),
    examUsefulness: hasSpecificTerm(text, context),
    trapPointSpecificity: true,
    tenSecondCheckConvertible: convertible && hasPromptShape,
    noForbiddenClaims: !testAny(FORBIDDEN_CLAIM_PATTERNS, text),
    noOfficialAnswerClaim: !testAny(OFFICIAL_ANSWER_PATTERNS, text),
    noScoreOrPassFail: !testAny(SCORE_OR_PASS_FAIL_PATTERNS, text),
    noRawTextLeak: safe && !containsContextLeak(text, context),
    conciseEnough: text.length <= 120,
    actionOriented: ACTION_TERMS.test(text),
  });
}

export function evaluateTrapPoint(trapPoint: unknown, context: ExplanationQualityContext = {}): ExplanationQualityResult {
  const text = typeof trapPoint === "string" ? clean(trapPoint) : clean((trapPoint as { text?: string } | null)?.text);
  return finalizeChecks({
    hasAllFourLabels: true,
    beginnerClarity: text.length >= 10 && !isVague(text),
    examUsefulness: hasSpecificTerm(text, context),
    trapPointSpecificity: !isVague(text) && hasSpecificTerm(text, context) && /구분|반대|예외|효과|표현|누락|섞|높은|낮은|단위|기준|권리구제|제3자|추인|소급|내부|준비|검산|방향/.test(text),
    tenSecondCheckConvertible: true,
    noForbiddenClaims: !testAny(FORBIDDEN_CLAIM_PATTERNS, text),
    noOfficialAnswerClaim: !testAny(OFFICIAL_ANSWER_PATTERNS, text),
    noScoreOrPassFail: !testAny(SCORE_OR_PASS_FAIL_PATTERNS, text),
    noRawTextLeak: !testAny(RAW_TEXT_PATTERNS, text) && !containsContextLeak(text, context),
    conciseEnough: text.length <= 140,
    actionOriented: ACTION_TERMS.test(text),
  });
}

export function evaluateExplanationLadderQuality(ladder: LadderLike, context: ExplanationQualityContext = {}): ExplanationQualityResult {
  const entries = normalizeEntries(ladder);
  const byLabel = new Map(entries.map((entry) => [entry.label, entry.text]));
  const bundle = textBundle(ladder, context);
  const hasAllFourLabels = REQUIRED_LABELS.every((label) => byLabel.has(label) && clean(byLabel.get(label)).length > 0);
  const easy = byLabel.get("1타 쉬운풀이") ?? "";
  const passLine = byLabel.get("합격 한 줄") ?? "";
  const trap = byLabel.get("출제자 함정") ?? "";
  const tenSecond = byLabel.get("10초 확인") ?? "";
  const trapEval = evaluateTrapPoint(trap, context);
  const checkEval = evaluateTenSecondCheck(tenSecond, context);
  const rawMarkers = (context.rawTextLeakMarkers ?? []).map(clean).filter((marker) => marker.length >= 6);

  const result = finalizeChecks({
    hasAllFourLabels,
    beginnerClarity: clean(easy).length >= 20 && clean(easy).length <= 140 && !isVague(easy) && hasSpecificTerm(easy, context),
    examUsefulness: hasDomainSpecificTerm(`${passLine} ${trap} ${tenSecond}`, context) && ACTION_TERMS.test(`${passLine} ${trap} ${tenSecond}`),
    trapPointSpecificity: trapEval.checks.trapPointSpecificity,
    tenSecondCheckConvertible: checkEval.checks.tenSecondCheckConvertible,
    noForbiddenClaims: !testAny(FORBIDDEN_CLAIM_PATTERNS, bundle),
    noOfficialAnswerClaim: !testAny(OFFICIAL_ANSWER_PATTERNS, bundle),
    noScoreOrPassFail: !testAny(SCORE_OR_PASS_FAIL_PATTERNS, bundle),
    noRawTextLeak: !testAny(RAW_TEXT_PATTERNS, bundle) && rawMarkers.every((marker) => !bundle.includes(marker)) && !containsContextLeak(bundle, context),
    conciseEnough: entries.every((entry) => entry.text.length <= 160) && bundle.length <= 760,
    actionOriented: ACTION_TERMS.test(`${trap} ${tenSecond}`),
  });
  recordLearningMetricIfEnabled(buildLearningMetricEvent({
    eventName: "explanation_quality_evaluated",
    examMode: ladder.examMode ?? context.examMode,
    subject: ladder.subject ?? context.subject,
    properties: {
      explanationQualityStatus: result.status,
      explanationQualityScoreBand: result.score >= 90 ? "90_100" : result.score >= 70 ? "70_89" : result.score >= 50 ? "50_69" : "0_49",
    },
  }));
  return result;
}

function containsContextLeak(value: string, context: ExplanationQualityContext) {
  const markers = (context.rawTextLeakMarkers ?? []).map(clean).filter((marker) => marker.length >= 6);
  return markers.some((marker) => value.includes(marker));
}

function finalizeChecks(checks: Record<ExplanationQualityCheckName, boolean>): ExplanationQualityResult {
  const failedChecks = CHECK_NAMES.filter((name) => checks[name] !== true);
  const score = scoreExplanationQuality({ failedChecks, checks });
  const status: ExplanationQualityStatus = failedChecks.some((name) => ["noForbiddenClaims", "noOfficialAnswerClaim", "noScoreOrPassFail", "noRawTextLeak"].includes(name))
    ? "fail"
    : failedChecks.length === 0
      ? "pass"
      : "needs_revision";
  return {
    metadataOnly: true,
    status,
    score,
    failedChecks,
    warnings: buildWarnings(failedChecks),
    safeRevisionHints: buildSafeRevisionHints(failedChecks),
    checks,
  };
}

function buildWarnings(failedChecks: ExplanationQualityCheckName[]) {
  return failedChecks.map((check) => `needs_${check}`);
}

function buildSafeRevisionHints(failedChecks: ExplanationQualityCheckName[]) {
  const hints: Partial<Record<ExplanationQualityCheckName, string>> = {
    hasAllFourLabels: "Use exactly the four ladder labels before returning the explanation.",
    beginnerClarity: "Rewrite the easy explanation with one concrete concept relation in plain language.",
    examUsefulness: "Tie the sentence to a recall, distinction, calculation, or rewrite action for appraiser prep.",
    trapPointSpecificity: "Name the specific exception, reversed effect, missing issue, or calculation direction to watch.",
    tenSecondCheckConvertible: "Make 10초 확인 an O/X prompt or cloze prompt with a blank.",
    noForbiddenClaims: "Remove official, grading, score, pass/fail, and guarantee language.",
    noOfficialAnswerClaim: "Do not present the text as an official answer, official grading, or confirmed model answer.",
    noScoreOrPassFail: "Remove score prediction, pass/fail judgment, and 합격보장 language.",
    noRawTextLeak: "Use only metadata-level concept labels and never copy learner, problem, answer, OCR, or source text.",
    conciseEnough: "Shorten each ladder entry to one operational sentence.",
    actionOriented: "End with a retrieval, O/X, cloze, retry, rewrite, or scheduled review action.",
  };
  return failedChecks.map((check) => hints[check] ?? `Revise ${check}.`);
}

export function scoreExplanationQuality(result: Pick<ExplanationQualityResult, "failedChecks" | "checks">): number {
  const passed = CHECK_NAMES.filter((name) => result.checks[name] === true).length;
  return Math.round((passed / CHECK_NAMES.length) * 100);
}

export function assertExplanationQuality(result: ExplanationQualityResult): asserts result is ExplanationQualityResult & { status: "pass" } {
  if (result.metadataOnly !== true || result.status !== "pass") {
    throw new Error(`Explanation quality check failed: ${result.failedChecks.join(", ") || "metadataOnly"}`);
  }
}
