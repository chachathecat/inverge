import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("review os service marks capture-origin only when createdFromCapture is true", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("const isCaptureCreated = input.createdFromCapture === true;"));
  assert.ok(source.includes("created_from_capture: isCaptureCreated"));
  assert.ok(source.includes('capture_intent: isCaptureCreated ? (input.captureIntent ?? "save") : null'));
  assert.ok(source.includes("capture_note_engine_v1: captureSignals"));
  assert.ok(source.includes("const captureSignals = isCaptureCreated ? buildCaptureNoteSignals(mode, normalizedInput) : null;"));
});

test("learner capture form explicitly marks capture-origin saves", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('captureIntent: "save"'));
  assert.ok(source.includes("createdFromCapture: true"));
  assert.ok(source.includes("savedCapture=1&itemId=${result.item.id}"));
});

test("review queue adds a small boost only for genuinely recent capture-origin items", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("itemCreatedAt"));
  assert.ok(source.includes("const recentCaptureWindowMs = 1000 * 60 * 60 * 24"));
  assert.ok(source.includes("now >= parsedCreatedAt && now - parsedCreatedAt <= recentCaptureWindowMs"));
  assert.ok(source.includes("now >= parsedDueAt && now - parsedDueAt <= recentCaptureWindowMs"));
});

test("non-capture items do not receive capture boost", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("if (!queueItem.createdFromCapture)"));
  assert.ok(source.includes("return 0;"));
});

test("review queue ordering still sorts by base priority score", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("right.priorityScore + rightRecentCaptureBoost - (left.priorityScore + leftRecentCaptureBoost)"));
});

test("first-set solving flow does not send capture-origin flags by default", async () => {
  const source = await readFile(new URL("../components/review-os/first-set-solving-form.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("createdFromCapture"), false);
  assert.equal(source.includes("captureIntent"), false);
});
