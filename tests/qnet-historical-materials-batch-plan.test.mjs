import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const docPath = "docs/qnet-historical-materials-batch-plan.md";

test("Q-Net historical materials batch plan preserves metadata-only local-source guardrails", async () => {
  assert.equal(existsSync(docPath), true);

  const doc = await readFile(docPath, "utf8");
  const lowerDoc = doc.toLowerCase();

  assert.match(lowerDoc, /metadata-only/);
  assert.match(doc, /partial_source_coverage/);
  assert.match(doc, /Never invent missing 2차 papers/);
  assert.match(doc, /No raw PDF\/HWP\/HWPX\/Word\/ZIP\/images/);
  assert.match(doc, /No raw problem text, answer text, OCR full text, official answer body/);
  assert.match(doc, /local_official_materials` must not be committed/);
  assert.match(doc, /qnet_manifest\.json`/);
  assert.match(doc, /Q-Net\/local official materials work must be done only in local Codex/);
  assert.match(doc, /2020 제31회/);

  assert.doesNotMatch(doc, /local_official_materials[\\/]/);
  assert.doesNotMatch(lowerDoc, /official problem example|official answer example/);
  assert.doesNotMatch(doc, /문제\s*예시|답안\s*예시|공식\s*문제\s*본문|공식\s*답안\s*본문/);
});
