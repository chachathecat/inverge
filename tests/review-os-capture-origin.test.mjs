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

test("review queue adds a small boost for recent capture-origin items", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("left.createdFromCapture"));
  assert.ok(source.includes("right.createdFromCapture"));
  assert.ok(source.includes("1000 * 60 * 60 * 24"));
});

test("first-set solving flow does not send capture-origin flags by default", async () => {
  const source = await readFile(new URL("../components/review-os/first-set-solving-form.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("createdFromCapture"), false);
  assert.equal(source.includes("captureIntent"), false);
});
