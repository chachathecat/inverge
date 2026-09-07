import { exactObject, requiredIdentifier, requiredSafeInteger } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import type { FinalReleaseProjection } from "./foundation-release";

export const ECONOMICS_CANDIDATE_SCHEMA = "first_stage.economics_private_candidate.v1";
function fail(): never { throw new Error("economics_candidate_invalid"); }
const sha = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) fail();
  return value as string;
};
function dense(value: unknown, count?: number): unknown[] {
  if (!Array.isArray(value) || (count !== undefined && value.length !== count) ||
    !value.length || value.length > 200) fail();
  for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) fail();
  return value;
}

/** Preparation projection after an exact file/version match. The loader currently
 * allows ONLY synthetic_test_only: real r3 requires the still-unimplemented 2025
 * full official-key/per-item final-release consumer, not just six checks.
 * The candidate contains no verified or human-review claims. This projection
 * changes no question content and issues no approval; v1 validates every row/key. */
export function projectApprovedEconomicsCandidate(value: unknown, expected: "human_reviewed_private" | "synthetic_test_only") {
  const candidate = exactObject(value, ["schemaVersion", "version", "dataClass", "authority",
    "exam", "sourceBinding", "reviewEvidence", "questions", "keys"]);
  if (candidate.schemaVersion !== ECONOMICS_CANDIDATE_SCHEMA || candidate.authority !== "LEARNING_ONLY" ||
    candidate.dataClass !== (expected === "human_reviewed_private" ? "private_review_candidate" : "synthetic_test_only")) fail();
  const exam = exactObject(candidate.exam, ["year", "round", "session", "booklet", "keyBookletExplicit"]);
  // Only the already authorized r3 historical profile; not a new year or live standard.
  if (exam.year !== 2025 || exam.round !== 36 || exam.session !== 1 || exam.booklet !== "A" || exam.keyBookletExplicit !== null) fail();
  const source = exactObject(candidate.sourceBinding, ["reviewPacketSha256", "questionPostId", "keyPostId",
    "questionFileSha256", "keyFileSha256"]);
  if (source.questionPostId !== "5231525" || source.keyPostId !== "5246129") fail();
  sha(source.reviewPacketSha256); sha(source.questionFileSha256); sha(source.keyFileSha256);
  const kinds = new Set<string>();
  for (const value of dense(candidate.reviewEvidence, 4)) {
    const row = exactObject(value, ["kind", "sha256"]);
    const kind = requiredIdentifier(row.kind); sha(row.sha256);
    if (!["ai_review", "calculations", "source_observation", "human_review_checklist"].includes(kind) || kinds.has(kind)) fail();
    kinds.add(kind);
  }
  const referenceMapping = new Map<string, string>();
  const projections = new Map<string, FinalReleaseProjection>();
  const positions = new Set<string>();
  const questions = dense(candidate.questions, 10).map(value => {
    const row = exactObject(value, ["reference", "kind", "sourceQuestionId", "stem", "choices", "correctChoice",
      "choiceExplanations", "easyExplanation", "concept", "feedback", "sourceEvidence", "rightsEvidence", "versionEvidence"]);
    const ref = exactObject(row.reference, ["schemaVersion", "questionId", "questionVersion", "subjectId", "examYear",
      "examRound", "sessionId", "questionNumber", "choiceCount", "sourceVersionManifestIds"]);
    if (ref.schemaVersion !== "first_stage.question_identity.v1" || ref.subjectId !== "economics_principles" ||
      ref.examYear !== exam.year || ref.examRound !== exam.round || ref.sessionId !== "qnet-2025-36-s1-A" ||
      !["original", "practice_retry"].includes(String(row.kind))) fail();
    const number = requiredSafeInteger(ref.questionNumber, 1, 200);
    if (![46, 49, 51, 52, 53].includes(number)) fail();
    const sourceId = `qnet-2025-36-s1-A-${number}`;
    if (ref.questionId !== (row.kind === "original" ? sourceId : `issue883-r3-r${number}`) ||
      row.sourceQuestionId !== (row.kind === "original" ? null : sourceId) || ref.questionVersion !== candidate.version) fail();
    const position = `${row.kind}:${number}`;
    if (positions.has(position)) fail();
    positions.add(position);
    dense(row.choices, 5); dense(row.choiceExplanations, 5);
    const feedback = exactObject(row.feedback, ["incorrectCauseByChoice", "biggestGapCode", "nextActionCode"]);
    dense(feedback.incorrectCauseByChoice, 5);
    const normalized = { ...ref, schemaVersion: "first_stage.question_reference.v1",
      rightsState: "verified_owner_private", currentnessState: "verified_exam_date" };
    const before = digest(ref);
    if (referenceMapping.has(before)) fail();
    referenceMapping.set(before, digest(normalized));
    const id = requiredIdentifier(ref.questionId);
    if (projections.has(id)) fail();
    // Closed metadata only before response; never project free-form review notes,
    // answer bases, key values or explanations as a question attribution.
    const question = Object.freeze([
      `출처: 한국산업인력공단 Q-Net · 2025년 제36회 1차 1교시 A형 경제학 ${number}번`,
      "공식 게시물: https://www.q-net.or.kr/cst003.do?artlSeq=5231525&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00309",
      row.kind === "original" ? (number === 53 ? "검토된 의미 보존 정규화 전사 · 글자 단위 동일 전사 아님" : "검토된 공식 원문 전사본") : "위 원문 계열의 자체 작성 변형 · 비공개 연습 전용 · 공식 문항 아님",
      "정답표에 A형이 명시된 것은 아님 · 책형 대응은 별도 사람 검토 대상",
    ]);
    projections.set(id, { question, feedback: Object.freeze([...question,
      row.kind === "original" ? "공식 최종정답 관찰값과의 대응을 별도로 검토한 비공개 학습 해설"
        : "변형의 자체 정답을 별도 검토 · 원문 공식 정답표를 변형에 적용하지 않음",
      ...(row.kind === "original" ? ["최종정답 출처: https://www.q-net.or.kr/cst003.do?artlSeq=5246129&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00310"] : []),
      expected === "synthetic_test_only" ? "합성 검토 증빙 · 실제 사람 검토나 학습 재고 아님" : "AI 해설 초안에 대한 별도 사람 검토 · 공식 해설 아님",
    ]) });
    return { ...row, reference: normalized };
  });
  const keys = dense(candidate.keys, questions.length).map(value => {
    const row = exactObject(value, ["questionReferenceSha256", "choiceSetSha256", "correctChoice", "authority", "evidence"]);
    const mapped = referenceMapping.get(sha(row.questionReferenceSha256));
    if (!mapped) fail();
    return { ...row, questionReferenceSha256: mapped };
  });
  return { packet: { schemaVersion: "first_stage.economics_private_content.v1", version: candidate.version,
    dataClass: expected, authority: candidate.authority, questions, keys }, projections };
}
