import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const baseUrl = process.env.OCR_EVAL_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const fixturesPath = new URL("../docs/ocr-quality-eval/fixtures.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fieldText(payload) {
  return JSON.stringify(payload.normalized_draft ?? {});
}

function collectScores(fixture) {
  return Object.entries(fixture.expect?.scores ?? {})
    .filter(([, value]) => typeof value === "number")
    .map(([field, value]) => ({ field, value }));
}

function summarizeScores(results) {
  const buckets = new Map();
  for (const result of results) {
    if (result.skipped) continue;
    for (const score of result.scores ?? []) {
      const bucket = buckets.get(score.field) ?? { total: 0, count: 0 };
      bucket.total += score.value;
      bucket.count += 1;
      buckets.set(score.field, bucket);
    }
  }
  return Object.fromEntries(
    [...buckets.entries()].map(([field, bucket]) => [field, Number((bucket.total / bucket.count).toFixed(2))]),
  );
}

function assertScores(fixture, scores) {
  const minimum = fixture.expect?.minimum_score;
  if (typeof minimum !== "number") return;
  const values = scores.map((score) => score.value);
  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  assert(average >= minimum, `${fixture.id}: score ${average.toFixed(2)} below ${minimum}`);
}

async function runTextFixture(fixture) {
  const body = new FormData();
  body.append("mode", fixture.mode);
  body.append("text", fixture.input);
  const response = await fetch(`${baseUrl}/api/inverge/ocr`, { method: "POST", body });
  const payload = await response.json();
  assert(response.status === 200 && payload.ok, `${fixture.id}: expected 200 ok, got ${response.status}`);
  const draft = payload.normalized_draft ?? {};
  assert(draft.subject_guess === fixture.expect.subject_guess, `${fixture.id}: subject ${draft.subject_guess}`);
  assert(Boolean(draft.needs_review) === fixture.expect.needs_review, `${fixture.id}: needs_review ${draft.needs_review}`);
  const text = fieldText(payload);
  for (const needle of fixture.expect.contains ?? []) {
    assert(text.includes(needle), `${fixture.id}: missing "${needle}" in normalized draft`);
  }
  const scores = collectScores(fixture);
  assertScores(fixture, scores);
  return { id: fixture.id, status: response.status, needs_review: draft.needs_review, scores };
}

async function runImageFixture(fixture) {
  if (!fixture.file || !existsSync(fixture.file)) {
    return { id: fixture.id, skipped: true, reason: "optional image fixture file missing" };
  }
  const body = new FormData();
  body.append("mode", fixture.mode);
  const bytes = readFileSync(fixture.file);
  body.append("images", new Blob([bytes]), basename(fixture.file));
  const response = await fetch(`${baseUrl}/api/inverge/ocr`, { method: "POST", body });
  const payload = await response.json();
  assert(response.status === 200 && payload.ok, `${fixture.id}: expected image OCR 200 ok, got ${response.status}`);
  const draft = payload.normalized_draft ?? {};
  if (fixture.expect.subject_guess) {
    assert(draft.subject_guess === fixture.expect.subject_guess, `${fixture.id}: subject ${draft.subject_guess}`);
  }
  if (typeof fixture.expect.needs_review === "boolean") {
    assert(Boolean(draft.needs_review) === fixture.expect.needs_review, `${fixture.id}: needs_review ${draft.needs_review}`);
  }
  const text = fieldText(payload);
  for (const needle of fixture.expect.contains ?? []) {
    assert(text.includes(needle), `${fixture.id}: missing "${needle}" in normalized draft`);
  }
  const scores = collectScores(fixture);
  assertScores(fixture, scores);
  return { id: fixture.id, status: response.status, needs_review: draft.needs_review, scores };
}

async function runPdfFixture(fixture) {
  if (!fixture.file || !existsSync(fixture.file)) {
    return { id: fixture.id, skipped: true, reason: "optional PDF fixture file missing" };
  }
  const body = new FormData();
  body.append("mode", fixture.mode);
  const bytes = readFileSync(fixture.file);
  body.append("pdf", new Blob([bytes], { type: "application/pdf" }), basename(fixture.file));
  const response = await fetch(`${baseUrl}/api/inverge/ocr`, { method: "POST", body });
  assert(response.status === fixture.expect.status, `${fixture.id}: expected ${fixture.expect.status}, got ${response.status}`);
  const scores = collectScores(fixture);
  assertScores(fixture, scores);
  return { id: fixture.id, status: response.status, scores };
}

async function main() {
  const results = [];
  for (const fixture of fixtures) {
    if (fixture.variant === "text") results.push(await runTextFixture(fixture));
    if (fixture.variant === "image") results.push(await runImageFixture(fixture));
    if (fixture.variant === "pdf") results.push(await runPdfFixture(fixture));
  }
  console.log(JSON.stringify({ ok: true, baseUrl, score_summary: summarizeScores(results), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
