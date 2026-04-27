import { searchTaxonomyCandidates } from "../lib/review-os/appraisal-taxonomy.ts";

const samples = [
  {
    label: "회계학 재고자산 저가법이 헷갈림",
    mode: "first",
    subject: "회계학",
    text: "회계학 재고자산 저가법이 헷갈림",
  },
  {
    label: "민법 물권 변동 요건이 헷갈림",
    mode: "first",
    subject: "민법",
    text: "민법 물권 변동 요건이 헷갈림",
  },
  {
    label: "보상법규 사업인정 절차가 약함",
    mode: "second",
    subject: "감정평가 및 보상법규",
    text: "보상법규 사업인정 절차가 약함",
  },
];

for (const sample of samples) {
  const candidates = searchTaxonomyCandidates({
    mode: sample.mode,
    subject: sample.subject,
    text: sample.text,
  }).slice(0, 3);

  const top = candidates[0] ?? null;
  const confidence = top ? normalizeConfidence(top.score, top.matchedKeywords.length) : 0;

  console.log(`\n[Sample] ${sample.label}`);
  console.log(`status=${top && confidence >= 0.45 ? "ai_suggested" : "needs_review"}, confidence=${confidence}`);

  if (!top) {
    console.log("- no candidates");
    continue;
  }

  console.log(`- top: ${top.node.subject} · ${top.node.unit} · ${top.node.topic} (${top.node.examSkill})`);
  console.log(`- node: ${top.node.id} / score=${top.score} / confidence=${confidence}`);
}

function normalizeConfidence(score, matchedKeywordsLength) {
  const normalizedScore = Math.min(1, score / 24);
  const normalizedMatch = Math.min(1, matchedKeywordsLength / 6);
  return Number((normalizedScore * 0.8 + normalizedMatch * 0.2).toFixed(2));
}
