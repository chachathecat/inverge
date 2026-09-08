import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { validatePrivateReviewPacket, reviewPacketSha256 } from "../../lib/review-os/first-stage/runtime/private-review-packet.mjs";
export { reviewPacketSha256 };

const labels = { stem: "문제", choices: "선지", officialKeyObserved: "공식 정답표 관찰값",
  proposedChoice: "자체 풀이 정답 후보", answerBasis: "정답 근거", concept: "확인할 개념",
  choiceExplanations: "선지별 설명 — AI 초안", easyExplanation: "쉬운풀이 — AI 초안",
  recalculation: "계산 과정", verifiedBy: "검증 방식", reviewNeeded: "사람 검토 필요",
  verification: "검토 상태", difference: "원문과의 차이" };
const escape = value => String(value).replace(/[&<>"']/gu,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const invalid = () => { throw new Error("private_review_packet_invalid"); };

function renderValue(value) {
  if (Array.isArray(value)) return `<ol>${value.map(item => `<li>${renderValue(item)}</li>`).join("")}</ol>`;
  if (value !== null && typeof value === "object") return `<dl>${Object.entries(value).map(([key, item]) =>
    `<dt>${escape(labels[key] ?? key)}</dt><dd data-field="${escape(key)}">${renderValue(item)}</dd>`).join("")}</dl>`;
  return `<span>${escape(typeof value === "string" ? value : JSON.stringify(value))}</span>`;
}

/** Private review output only. This renderer cannot approve or install content. */
export function renderPrivateReviewPacket(source, calculationSource) {
  const { packet, pairs } = validatePrivateReviewPacket(source, calculationSource);
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
