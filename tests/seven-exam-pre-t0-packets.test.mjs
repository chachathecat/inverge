import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRE_T0_REQUIRED_ARTIFACTS,
  SEVEN_EXAM_CELL_IDS,
  validateSevenExamPreT0PacketV1,
} from "../lib/exam-cells/pre-t0.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../config/dabangil-seven-exam-pre-t0-packets-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("seven exact Exam Trust Cells have complete fail-closed artifact inventories", () => {
  const index = validateSevenExamPreT0PacketV1(fixture);
  assert.equal(index.cellCount, 7);
  assert.equal(index.cells.length, SEVEN_EXAM_CELL_IDS.length);
  assert.equal(index.allCellsPreT0Ready, false);
  assert.equal(index.runtimeAuthorized, false);
  assert.equal(index.rightsDecisionAuthorized, false);
  for (const cell of index.cells) {
    assert.equal(cell.validatedArtifactCount, 0);
    assert.equal(cell.locatedArtifactCount, 0);
    assert.equal(cell.pendingArtifactCount, PRE_T0_REQUIRED_ARTIFACTS.length);
    assert.equal(cell.preT0Ready, false);
  }
});

test("packet identity is deterministic and order independent", () => {
  const first = validateSevenExamPreT0PacketV1(fixture);
  const reordered = structuredClone(fixture);
  reordered.cells.reverse();
  for (const cell of reordered.cells) cell.artifacts.reverse();
  const second = validateSevenExamPreT0PacketV1(reordered);
  assert.equal(first.packetDigest, second.packetDigest);
  assert.ok(first.packetDigest.startsWith("sha256:"));
});

test("false readiness, missing artifacts, and unlocated validation fail closed", () => {
  const falseReady = structuredClone(fixture);
  falseReady.cells[0].status = "PRE_T0_PACKET_VALIDATED";
  assert.throws(
    () => validateSevenExamPreT0PacketV1(falseReady),
    /false-ready-state/u,
  );

  const missing = structuredClone(fixture);
  missing.cells[0].artifacts.pop();
  assert.throws(
    () => validateSevenExamPreT0PacketV1(missing),
    /artifact-set-mismatch/u,
  );

  const unlocated = structuredClone(fixture);
  unlocated.cells[0].artifacts[0].status = "VALIDATED_SOURCE_ONLY";
  assert.throws(
    () => validateSevenExamPreT0PacketV1(unlocated),
    /validated-artifact-unlocated/u,
  );
});

test("raw problem, answer, OCR, prompt, and response bodies are forbidden", () => {
  for (const key of [
    "questionBody",
    "answerBody",
    "ocrText",
    "prompt",
    "response",
    "sourceBody",
  ]) {
    const unsafe = structuredClone(fixture);
    unsafe.cells[0][key] = "forbidden raw body";
    assert.throws(
      () => validateSevenExamPreT0PacketV1(unsafe),
      /raw-body-forbidden/u,
    );
  }
});
