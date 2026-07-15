import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const ui = read("components/learner/study-ledger-ui.tsx");
const globals = read("app/globals.css");
const detail = ui.slice(ui.indexOf("export function StudyLedgerDetail"));
const readingStart = detail.indexOf("data-s232d2-reading-column");
const railStart = detail.indexOf("<aside", readingStart);
const railEnd = detail.indexOf("</aside>", railStart);
const reading = detail.slice(readingStart, railStart);
const rail = detail.slice(railStart, railEnd);

test("S232D.2 assigns learner work to the reading column in canonical order", () => {
  assert.ok(readingStart >= 0, "missing D.2 reading-column ownership marker");
  assert.ok(railStart > readingStart, "rail must follow the reading column");

  const order = [
    "<TrustEvidenceBar",
    "<BiggestGap",
    "data-s232d2-recovery-context",
    "data-s232d2-learner-evidence",
    "<EvidenceExcerpt",
    "<StickyAction",
  ].map((needle) => reading.indexOf(needle));
  assert.ok(order.every((index) => index >= 0), `missing reading block: ${order.join(",")}`);
  assert.deepEqual(order, [...order].sort((left, right) => left - right));

  assert.equal((reading.match(/<EvidenceExcerpt/g) ?? []).length, 1);
  assert.match(reading, /source: "Learner"/);
  assert.match(reading, /sourceBasis: "learner-authored"/);
  assert.match(reading, /review: "Default"/);
  assert.equal((detail.match(/<StickyAction\s/g) ?? []).length, 1);
});

test("S232D.2 limits the evidence rail to persisted review and fail-closed support", () => {
  assert.match(rail, /data-s232d2-review-context/);
  assert.match(rail, /<UntypedReferenceDisclosure/);
  assert.match(rail, /<StudyLedgerSupportingEvidencePanel/);
  assert.match(rail, /data-s232d2-linked-learning/);
  assert.doesNotMatch(rail, /<TrustEvidenceBar|<BiggestGap|<EvidenceExcerpt|<StickyAction|learnerEvidence/);
  assert.doesNotMatch(reading, /data-s232d2-review-context|<UntypedReferenceDisclosure|<StudyLedgerSupportingEvidencePanel/);
});

test("S232D.2 keeps learner and reference empty states independent", () => {
  const invitedRuntime = read("tests/e2e/s227-invited-runtime-acceptance.spec.ts");

  assert.doesNotMatch(detail, /const evidenceEmpty/);
  assert.match(reading, /data-s232d2-learner-state="empty"/);
  assert.match(rail, /<StudyLedgerEvidenceEmpty/);
  assert.match(ui, /data-s232d2-reference-state="empty"/);
  assert.match(ui, /참고용 근거가 연결되지 않았습니다\./);
  assert.doesNotMatch(ui, /나란히 확인/);
  assert.match(invitedRuntime, /참고용 근거가 연결되지 않았습니다\./);
  assert.doesNotMatch(invitedRuntime, /비교할 근거가 아직 없습니다\./);
});

test("S232D.2 never promotes untyped reference text to Official or Confirmed", () => {
  const disclosureStart = ui.indexOf("function UntypedReferenceDisclosure");
  const disclosureEnd = ui.indexOf("export function StudyLedgerEvidenceEmpty", disclosureStart);
  const disclosure = ui.slice(disclosureStart, disclosureEnd);

  assert.match(disclosure, /data-s232d2-reference-untyped/);
  assert.doesNotMatch(disclosure, /Official|Confirmed|verified-official-source|확인됨/);
  assert.match(rail, /sourceLabel="참고용 근거 · 원 출처 확인"/);
  assert.doesNotMatch(rail, /source: "Official"|review: "Confirmed"|verified-official-source/);
});

test("S232D.2 preserves 680 + 32 + 288 desktop geometry and a 768 single column", () => {
  assert.match(detail, /data-s232d2-ledger-workspace/);
  assert.match(detail, /grid gap-8 lg:grid-cols-\[minmax\(0,var\(--ledger-reading-column\)\)_var\(--ledger-evidence-rail\)\]/);
  assert.doesNotMatch(detail, /(?:sm|md):grid-cols-\[minmax\(0,var\(--ledger-reading-column\)\)/);
  assert.match(globals, /--ledger-reading-column:\s*680px/);
  assert.match(globals, /--ledger-evidence-rail:\s*288px/);
});

test("S232D.2 runtime gate is exact-head and metadata-only", () => {
  const spec = read("tests/e2e/s232d2-study-ledger-body-ia.spec.ts");
  const workflow = read(".github/workflows/s232d2-runtime.yml");
  const jobEnv = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232D\.2"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /data-s232d2-reading-column/);
  assert.match(spec, /data-s232d2-evidence-rail/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /element === document\.activeElement/);
  assert.match(spec, /rawLearnerContentCaptured: false/);
  assert.match(spec, /screenshotCaptured: false/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /Require explicit authenticated acceptance marker/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /tests\/e2e\/s232d2-study-ledger-body-ia\.spec\.ts/);
  assert.match(workflow, /metadata-only S232D\.2 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(workflow, /path: validated-runtime-evidence\/s232d2-runtime\.json/);
  assert.doesNotMatch(jobEnv, /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/);
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(workflow, /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/);
});
