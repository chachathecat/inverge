import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("capture initial screen hides optional metadata by default", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("선택 정보"));
  assert.ok(source.includes("<details className=\"mt-4 rounded"));
});

test("source type inferred from action and capture type chooser removed", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("inferSourceTypeFromAction"));
  assert.equal(source.includes("캡처 유형"), false);
});

test("subject allows defer confirmation", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("나중에 확인"));
  assert.ok(source.includes('update("subjectLabel", "")'));
});

test("save asks one just-in-time missing field question", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("firstMissing"));
  assert.ok(source.includes("한 가지만 확인"));
});
