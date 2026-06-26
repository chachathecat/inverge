import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceOfTruthDocs = [
  "AGENTS.md",
  "docs/inverge-second-round-final-product-spec.md",
  "docs/dabangil-second-exam-premium-os.md",
  "docs/dabangil-giii-practical-routine.md",
  "docs/dabangil-deep-review-unit-policy.md",
  "docs/dabangil-premium-figma-brief.md",
  "docs/inverge-master-roadmap.md",
  "docs/inverge-business-model.md",
  "docs/inverge-product-brief.md",
];

const s200rDocs = [
  "docs/dabangil-second-exam-premium-os.md",
  "docs/dabangil-giii-practical-routine.md",
  "docs/dabangil-deep-review-unit-policy.md",
  "docs/dabangil-premium-figma-brief.md",
];

async function read(path) {
  return readFile(path, "utf8");
}

async function combined(paths = sourceOfTruthDocs) {
  const parts = await Promise.all(paths.map(read));
  return parts.join("\n");
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    if (!body) return [];
    return body.split(",").map((entry) => parseScalar(entry));
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  return value.replace(/^['"]|['"]$/g, "");
}

function parseActiveProgram(source) {
  const program = {};
  const items = [];
  let section = null;
  let currentItem = null;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      section = top[1];
      currentItem = null;
      continue;
    }
    if (section === "program") {
      const field = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field) program[field[1]] = parseScalar(field[2]);
      continue;
    }
    if (section === "items") {
      const start = line.match(/^\s{2}-\s+id:\s*(.*)$/);
      if (start) {
        currentItem = { id: parseScalar(start[1]) };
        items.push(currentItem);
        continue;
      }
      const field = line.match(/^\s{4}([A-Za-z][\w-]*):\s*(.*)$/);
      if (field && currentItem) currentItem[field[1]] = parseScalar(field[2]);
    }
  }

  return { program, items, byId: new Map(items.map((item) => [item.id, item])) };
}

test("S200R docs lock learner brand, premium product, scope, and GIII model", async () => {
  const docs = await combined();

  assert.match(docs, /learner-facing brand(?:[^\\n]{0,80})답안길/i);
  assert.match(docs, /답안길 2차 합격관제 OS/);
  assert.match(docs, /감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS/);
  assert.match(docs, /감정평가실무/);
  assert.match(docs, /감정평가이론/);
  assert.match(docs, /감정평가 및 보상법규/);
  assert.match(docs, /casio_fx_9860giii/);
  assert.match(docs, /시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다/);
  assert.match(docs, /no stored-program dependency|stored-program dependency/i);
});

test("S200R final catalog and Deep Review Unit policy are documented", async () => {
  const docs = await combined();
  for (const planId of ["free", "second_os_basic", "second_os_pro", "second_control_premium"]) {
    assert.match(docs, new RegExp(`\\\`${planId}\\\``), `missing final plan ${planId}`);
  }
  for (const skuId of ["deep_review_5", "deep_review_15", "deep_review_40"]) {
    assert.match(docs, new RegExp(`\\\`${skuId}\\\``), `missing Deep Review SKU ${skuId}`);
  }

  assert.match(docs, /1 unit = one 25~50 point sub-question or up to 5 answer pages/);
  assert.match(docs, /2 units = one 100-minute full answer/);
  assert.match(docs, /Failed generation must not consume units/i);
  assert.match(docs, /managed_cohort[\s\S]{0,160}later-only[\s\S]{0,80}disabled/i);
  assert.match(docs, /season_pass[\s\S]{0,120}later-only[\s\S]{0,80}disabled/i);
  assert.match(docs, /No unlimited second-exam precision review|no unlimited second-exam precision review/);
});

test("old Core and Intensive labels are not used as final target taxonomy", async () => {
  const docs = await combined();
  const forbiddenFinalTargetPatterns = [
    /Core:\s*(?:월|list-price|정가)/,
    /Intensive:\s*(?:월|list-price|정가)/,
    /Core\s+30\s+reviews/i,
    /Intensive\s+80\s+reviews/i,
    /Free\s+Core\s+Intensive/i,
    /##\s*10\.\d+\s+Core\b/,
    /##\s*10\.\d+\s+Intensive\b/,
  ];

  for (const pattern of forbiddenFinalTargetPatterns) {
    assert.doesNotMatch(docs, pattern);
  }
  assert.match(docs, /Legacy labels `Core` and `Intensive` are not the final target taxonomy/);
});

test("S200R docs preserve no-official-authority and no-B2C-human-review boundaries", async () => {
  const docs = await combined();

  assert.match(docs, /답안길 is not:[\s\S]{0,240}official grader/i);
  assert.match(docs, /답안길 is not:[\s\S]{0,260}official model-answer/i);
  assert.match(docs, /pass-probability product/i);
  assert.match(docs, /guaranteed-score product/i);
  assert.match(docs, /human expert-review B2C service/i);
  assert.match(docs, /must not imply pass guarantee/i);
  assert.match(docs, /must not sell human expert review as a B2C product|B2C 상품으로 판매하지 않는다/i);
});

test("active program adds S200R, completes S201/S202, preserves WIP, and updates downstream dependencies", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));

  assert.equal(roadmap.program.wipLimit, 2);
  assert.equal(roadmap.byId.get("S201").status, "completed");
  assert.equal(roadmap.byId.get("S202").status, "completed");

  assert.deepEqual(roadmap.byId.get("S200R"), {
    id: "S200R",
    title: "Dabangil Premium Second-Round Control OS Alignment",
    status: "completed",
    dependencies: ["S201", "S202"],
    lockGroup: "constitution",
    risk: "medium",
    priority: 4,
  });

  assert.deepEqual(roadmap.byId.get("S203").dependencies, ["S200R", "S201", "S202"]);
  assert.deepEqual(roadmap.byId.get("S204").dependencies, ["S200R"]);
  assert.deepEqual(roadmap.byId.get("S205").dependencies, ["S200R", "S201", "S204"]);
  assert.deepEqual(roadmap.byId.get("S210").dependencies, ["S200R", "S201", "S203"]);
  assert.deepEqual(roadmap.byId.get("S219").dependencies, ["S200R"]);
});

test("active program dependency graph has no missing dependencies or self-dependencies", async () => {
  const roadmap = parseActiveProgram(await read("roadmap/active-program.yml"));
  const ids = new Set(roadmap.items.map((item) => item.id));

  for (const item of roadmap.items) {
    assert.equal(ids.has(item.id), true, `missing own id ${item.id}`);
    for (const dependency of item.dependencies ?? []) {
      assert.equal(ids.has(dependency), true, `${item.id} depends on missing ${dependency}`);
      assert.notEqual(dependency, item.id, `${item.id} must not depend on itself`);
    }
  }
});

test("S200R docs remain metadata-only without raw learner or official question content", async () => {
  const docs = await combined(s200rDocs);

  const forbiddenFields = [
    "rawLearnerText",
    "rawOcrText",
    "rawOCRText",
    "rawQuestionText",
    "rawAnswerText",
    "questionText",
    "answerText",
    "officialAnswer",
    "modelAnswer",
    "learnerAnswer",
    "problemText",
  ];
  for (const field of forbiddenFields) {
    assert.equal(docs.includes(`"${field}"`), false, `${field} must not be committed as structured data`);
  }

  const forbiddenRawPrompts = [
    "다음 중 옳은 것은",
    "다음 중 틀린 것은",
    "위 사례에서",
    "제시문을 읽고",
    "아래 자료를 이용하여",
    "기출문제 원문",
    "문제 전문",
    "답안 전문",
    "OCR 원문",
  ];
  for (const phrase of forbiddenRawPrompts) {
    assert.equal(docs.includes(phrase), false, `raw prompt marker must not appear: ${phrase}`);
  }
});
