import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const docPath = new URL("../docs/ocr-provider-decision.md", import.meta.url);

test("doc exists", async () => {
  await access(docPath, constants.F_OK);
});

test("includes candidate providers", async () => {
  const doc = await readFile(docPath, "utf8");

  const required = [
    "Gemini vision/OCR",
    "Google Document AI",
    "local/manual extraction",
    "future provider",
  ];

  for (const token of required) {
    assert.equal(doc.includes(token), true, `missing provider: ${token}`);
  }
});

test("includes evaluation criteria", async () => {
  const doc = await readFile(docPath, "utf8");

  const required = [
    "Korean PDF handling",
    "table/numeric extraction quality",
    "handwritten vs printed text distinction",
    "cost",
    "latency",
    "data retention/privacy",
    "failure modes",
    "review workflow compatibility",
  ];

  for (const token of required) {
    assert.equal(doc.includes(token), true, `missing criteria: ${token}`);
  }
});

test("includes required guardrails", async () => {
  const doc = await readFile(docPath, "utf8");

  const required = [
    "reference_only",
    "needs_review",
    "raw source text를 노출하지 않는다",
    "official answer/scoring claims",
    "raw user OCR/user answer data",
  ];

  for (const token of required) {
    assert.equal(doc.includes(token), true, `missing guardrail: ${token}`);
  }
});

test("includes one-source pilot id", async () => {
  const doc = await readFile(docPath, "utf8");

  assert.equal(doc.includes("appraiser-second-2025-36-practice-q1-source-pdf"), true);
});

test("no code route for OCR provider was added", async () => {
  const shouldNotExist = [
    new URL("../app/api/ocr-provider/route.ts", import.meta.url),
    new URL("../app/api/ocr/route.ts", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no upload route was added", async () => {
  const shouldNotExist = [
    new URL("../app/api/upload/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no learner source viewer/archive UI", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no official answer/scoring/pass-fail language", async () => {
  const doc = await readFile(docPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "합격/불합격", "자동 채점"];

  for (const token of forbidden) {
    assert.equal(doc.includes(token), false, `forbidden token found: ${token}`);
  }
});
