import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const labels = { stem: "문제", choices: "선지", officialKeyObserved: "공식 정답표 관찰값",
  proposedChoice: "자체 풀이 정답 후보", answerBasis: "정답 근거", concept: "확인할 개념",
  choiceExplanations: "선지별 설명 — AI 초안", easyExplanation: "쉬운풀이 — AI 초안",
  recalculation: "계산 과정", verifiedBy: "검증 방식", reviewNeeded: "사람 검토 필요",
  verification: "검토 상태", difference: "원문과의 차이" };
const escape = value => String(value).replace(/[&<>"']/gu,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export const reviewPacketSha256 = source => crypto.createHash("sha256").update(source).digest("hex");
const invalid = () => { throw new Error("private_review_packet_invalid"); };
const deniedAuthorityFlags = new Set(["runtimeEligible", "transferOrMeasurementEligible",
  "humanReviewComplete", "runtimeAuthorityGranted"]);

function pendingHumanReview(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === 3 && Object.keys(value).every(key => ["reviewer", "decision", "state"].includes(key)) &&
    value.reviewer === null && value.decision === null && value.state === "pending";
}

function assertReviewOnly(value) {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (deniedAuthorityFlags.has(key) && child !== false) invalid();
    if (key === "humanReview" && child !== false && !pendingHumanReview(child)) invalid();
    if (key === "verifiedBy" && child?.human !== false) invalid();
    assertReviewOnly(child);
  }
}

function renderValue(value) {
  if (Array.isArray(value)) return `<ol>${value.map(item => `<li>${renderValue(item)}</li>`).join("")}</ol>`;
  if (value !== null && typeof value === "object") return `<dl>${Object.entries(value).map(([key, item]) =>
    `<dt>${escape(labels[key] ?? key)}</dt><dd data-field="${escape(key)}">${renderValue(item)}</dd>`).join("")}</dl>`;
  return `<span>${escape(typeof value === "string" ? value : JSON.stringify(value))}</span>`;
}

/** Private review output only. This renderer cannot approve or install content. */
export function renderPrivateReviewPacket(source, calculationSource) {
  const packet = JSON.parse(source), calculation = JSON.parse(calculationSource);
  assertReviewOnly(packet);
  assertReviewOnly(calculation);
  if (!Array.isArray(packet.originals) || !Array.isArray(packet.retryCandidates) ||
    !packet.originals.length || packet.originals.length > 20 ||
    packet.originals.length !== packet.retryCandidates.length || packet.runtimeEligible !== false ||
    calculation.reviewPacketSha256 !== reviewPacketSha256(source)) invalid();
  const rows = [...packet.originals, ...packet.retryCandidates];
  if (new Set(packet.originals.map(row => row.number)).size !== packet.originals.length) invalid();
  const ids = rows.map(row => row.id);
  if (new Set(ids).size !== ids.length || calculation.results?.length !== rows.length) invalid();
  const results = new Map(calculation.results.map(result => [result.id, result]));
  if (results.size !== rows.length) invalid();
  for (const row of rows) {
    if (typeof row.id !== "string" || !Array.isArray(row.choices) || row.choices.length !== 5 ||
      !Array.isArray(row.choiceExplanations) || row.choiceExplanations.length !== 5 ||
      row.runtimeEligible !== false || row.transferOrMeasurementEligible !== false) invalid();
    // Named concepts are explanations of a skill, never an answer/choice list.
    // Validate before rendering; generic rendering previously hid a bad mapping.
    if (typeof row.concept !== "string" || !row.concept.trim() || row.concept.length > 300 ||
      /[0-9①-⑩]/u.test(row.concept) || rows.some(other =>
        [other.stem, other.easyExplanation, ...other.choiceExplanations].includes(row.concept))) invalid();
    if ([row.stem, row.easyExplanation, ...row.choices, ...row.choiceExplanations]
      .some(value => typeof value !== "string" || !value.trim())) invalid();
    const original = packet.originals.includes(row);
    const result = results.get(original ? `original-${row.number}` : row.id);
    if (!result || result.checksPassed !== true || result.humanReview !== false ||
      result.runtimeAuthorityGranted !== false || result.computedChoice !==
      (original ? row.officialKeyObserved : row.proposedChoice)) invalid();
    if (original ? row.verifiedBy?.human !== false : row.officialKeyApplies !== false) invalid();
  }
  const pairs = packet.originals.map(original => {
    const matches = packet.retryCandidates.filter(retry => retry.sourceOriginalNumber === original.number);
    if (matches.length !== 1) invalid();
    return [original, matches[0]];
  });
  const metadata = Object.fromEntries(Object.entries(packet).filter(([key]) => !["originals", "retryCandidates"].includes(key)));
  const articles = pairs.flatMap(([original, retry]) => [
    `<article data-question-id="${escape(original.id)}"><h2>공식 원문 ${escape(original.number)}번</h2>${renderValue(original)}</article>`,
    `<article data-question-id="${escape(retry.id)}"><h2>자체 작성 변형 후보 ${escape(retry.id)}</h2>${renderValue(retry)}</article>`,
  ]).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>경제학 비공개 검토 후보</title><style>
body{font:16px/1.7 system-ui,sans-serif;color:#172333;background:#eef2f6;margin:0}main{max-width:960px;margin:auto;padding:28px}
article,section{background:white;padding:26px;margin:24px 0;border-radius:12px}h1{font-size:28px}h2{font-size:23px}
dt{font-weight:700;margin-top:14px;color:#32465b}dd{margin:4px 0 16px 16px}li{padding:5px}span{white-space:pre-wrap;overflow-wrap:anywhere}
.warning{border-left:5px solid #ad5616;background:#fff4e8}a{color:#17528c}@media print{body{background:white}article{break-before:page}main{padding:0}}
</style></head><body><main><h1>경제학 최초 연결·검토 후보</h1><section class="warning">
사람 검토 대기 / 실사용 미승인 / 과목 완성 아님<br>AI 전사·해설·코드 재계산은 인적 검토를 대체하지 않습니다.
<p><a href="REVIEW.md">검토 순서와 사람 확인 항목</a> · <a href="calculation-results.json">정확한 버전의 재계산 결과</a></p>
<p>Packet SHA-256: ${reviewPacketSha256(source)}</p></section><section><h2>출처·권리·책형 결속 상태</h2>
${renderValue(metadata)}</section>${articles}</main></body></html>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const root = path.resolve(process.argv[2] ?? "");
    const relative = path.relative(process.cwd(), root);
    if (!path.isAbsolute(process.argv[2] ?? "") || (!relative.startsWith("..") && !path.isAbsolute(relative))) invalid();
    const source = readFileSync(path.join(root, "review-packet.json"), "utf8");
    const calculations = readFileSync(path.join(root, "calculation-results.json"), "utf8");
    writeFileSync(path.join(root, "review-packet.html"), renderPrivateReviewPacket(source, calculations));
    console.log(JSON.stringify({ rendered: true, packetSha256: reviewPacketSha256(source), humanReview: false, runtimeEligible: false }));
  } catch { console.error("private_review_packet_invalid"); process.exitCode = 1; }
}
