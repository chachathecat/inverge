import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TRUST_AUTHORITY_BOUNDARY,
  TRUST_EVIDENCE_BAR_DISCLOSURES,
  TRUST_EVIDENCE_BAR_STATES,
  buildTrustProvenanceModel,
  resolveTrustEvidenceBarState,
} from "../lib/review-os/trust-provenance.ts";

const read = (path) => readFileSync(path, "utf8");
const component = read("components/learner/trust-evidence-bar.tsx");
const ledger = read("components/learner/study-ledger-ui.tsx");
const itemPage = read("app/app/items/[itemId]/page.tsx");
const fixture = read("app/acceptance/figma-v3-trust-evidence/page.tsx");
const barrel = read("components/learner/index.ts");
const runner = read("scripts/run-node-tests.mjs");
const qa = read("docs/qa/s232b1-trust-evidence-bar-parity.md");
const workflow = read(".github/workflows/s232b1-runtime.yml");
const browserRuntime = read("tests/e2e/s232b1-trust-evidence-bar.spec.ts");
const authRuntime = read("tests/e2e/s232b1-authenticated-runtime.spec.ts");

test("S232B.1 maps only typed trust evidence into the exact three-state Figma contract", () => {
  assert.deepEqual(TRUST_EVIDENCE_BAR_STATES, ["Verified", "NeedsReview", "Conflict"]);
  assert.deepEqual(TRUST_EVIDENCE_BAR_DISCLOSURES, ["Collapsed", "Expanded"]);

  const cases = [
    [{ kind: "learner_confirmation", learnerConfirmed: true }, "Verified"],
    [{ kind: "verified_record", recordVerified: true }, "Verified"],
    [{ kind: "review_requirement", reviewRequired: true }, "NeedsReview"],
    [{ kind: "conflict_record", conflictRecorded: true }, "Conflict"],
    [{ kind: "offline_state", offline: true }, null],
    [{ kind: "unavailable", evidenceAvailable: false }, null],
  ];

  for (const [evidence, expected] of cases) {
    const model = buildTrustProvenanceModel(
      evidence,
      evidence.kind === "unavailable" ? ["none"] : ["persisted_record"],
    );
    assert.equal(resolveTrustEvidenceBarState(model), expected);
    assert.deepEqual(model.authorityBoundary, TRUST_AUTHORITY_BOUNDARY);
  }

  assert.equal(TRUST_AUTHORITY_BOUNDARY.officialGradingAllowed, false);
  assert.equal(TRUST_AUTHORITY_BOUNDARY.confirmedScoreAllowed, false);
  assert.equal(TRUST_AUTHORITY_BOUNDARY.passProbabilityAllowed, false);
  assert.equal(TRUST_AUTHORITY_BOUNDARY.deviceVerificationAllowed, false);
});

test("S232B.1 client primitive matches Figma geometry and supplies accessible disclosure behavior", () => {
  assert.match(component, /^"use client";/);
  assert.match(component, /useId/);
  assert.match(component, /useState\(defaultExpanded\)/);
  assert.match(component, /data-v3-component="TrustEvidenceBar"/);
  assert.match(component, /data-v3-state=\{state \?\? undefined\}/);
  assert.match(component, /data-v3-view=\{disclosure\}/);
  assert.match(component, /data-v3-expanded=\{expanded \? "Yes" : "No"\}/);
  assert.match(component, /data-trust-fallback=\{state \? undefined : "neutral"\}/);
  assert.match(component, /data-s228-trust-evidence/);
  assert.match(component, /<button[\s\S]*type="button"/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /aria-controls=\{detailsId\}/);
  assert.match(component, /hidden=\{!expanded\}/);
  assert.match(component, /min-h-11 min-w-11/);
  assert.match(component, /expanded \? "min-h-\[170px\]" : "min-h-\[72px\]"/);
  assert.doesNotMatch(component, /transition-\[min-height\]/);
  assert.match(component, /rounded-\[var\(--v3-radius-control\)\]/);
  assert.match(component, /size-6/);
  assert.match(component, /v3-type-label-strong/);
  assert.match(component, /v3-type-compact/);
  assert.match(component, /v3-type-caption/);
  assert.match(component, /bg-\[var\(--color-background-brand-soft\)\]/);
  assert.match(component, /bg-\[var\(--color-background-attention\)\]/);
  assert.match(component, /bg-\[var\(--color-background-risk\)\]/);
  assert.match(component, /border-\[var\(--color-icon-brand\)\]/);
  assert.match(component, /role="status"/);
  assert.doesNotMatch(component, /role="alert"|line-clamp|truncate|overflow-hidden/);
  assert.doesNotMatch(component, /(?:^|[\s"'])h-\[(?:72|170)px\]/m);

  for (const literal of ["#eef4fb", "#e1ded6", "#10233f", "#fef4e7", "#b56b16", "#7a430c", "#fdedec", "#b24d45", "#8f3832"]) {
    assert.equal(component.toLowerCase().includes(literal), false);
  }
});

test("S232B.1 places one trust bar in the reading column before BiggestGap and removes the rail duplicate", () => {
  const detailStart = ledger.indexOf("export function StudyLedgerDetail");
  const detail = ledger.slice(detailStart);
  const readingColumnIndex = detail.indexOf("data-s232b1-reading-column");
  const readingBarIndex = detail.indexOf("<TrustEvidenceBar");
  const biggestGapIndex = detail.indexOf("<BiggestGap");
  const railStart = detail.indexOf("<aside data-s228-evidence-rail");
  const railEnd = detail.indexOf("</aside>", railStart);
  const rail = detail.slice(railStart, railEnd);

  assert.ok(readingColumnIndex >= 0);
  assert.ok(readingBarIndex > readingColumnIndex);
  assert.ok(readingBarIndex < biggestGapIndex);
  assert.equal((detail.match(/<TrustEvidenceBar/g) ?? []).length, 1);
  assert.doesNotMatch(rail, /<StudyLedgerTrustBar|<TrustEvidenceBar/);
  assert.match(detail, /className="space-y-5"/);
  assert.match(detail, /max-w-\[1000px\] px-5 pb-28 pt-6[^\n]*lg:px-0/);
  assert.match(detail, /grid gap-8/);
  assert.match(detail, /adaptLegacyTrustSignals\(\{[\s\S]*conflictRecorded: evidenceConflict,[\s\S]*learnerConfirmed,[\s\S]*\}\)/);
  assert.doesNotMatch(detail, /reviewRequired:\s*!learnerConfirmed|reviewRequired=\{!learnerConfirmed\}/);
  assert.match(detail, /data-s228-evidence-rail/);
  assert.match(ledger, /export function StudyLedgerTrustBar/);
  assert.match(itemPage, /savedAt=\{resolvedDetail\.item\.updatedAt\}/);
  assert.doesNotMatch(detail, /공식 근거 2개|OCR 확인 완료|2분 전|방금 전/);
});

test("S232B.1 exposes a Preview-only six-variant synthetic matrix without learner data", () => {
  assert.match(fixture, /VERCEL_ENV !== "preview"/);
  assert.match(fixture, /NODE_ENV !== "development"/);
  assert.match(fixture, /notFound\(\)/);
  assert.match(fixture, /data-private-learner-data="absent"/);
  assert.match(fixture, /stateFixtures\.flatMap/);
  assert.match(fixture, /disclosures\.map/);
  assert.match(fixture, /defaultExpanded=\{disclosure === "Expanded"\}/);
  assert.doesNotMatch(
    fixture,
    /prisma|supabase|getReviewOsServerContext|cookies\(|headers\(|from\s+["'][^"']*auth[^"']*["']/i,
  );
  for (const state of TRUST_EVIDENCE_BAR_STATES) assert.ok(fixture.includes(`state: "${state}"`));
  assert.ok(runner.includes("tests/s232b1-trust-evidence-bar-parity.test.mjs"));
});

test("S232B.1 exports the canonical primitive and exact public variant types", () => {
  assert.match(barrel, /export \{ TrustEvidenceBar \}/);
  assert.match(barrel, /TrustEvidenceBarProps/);
  assert.match(barrel, /TrustEvidenceBarDisclosure/);
  assert.match(barrel, /TrustEvidenceBarState/);
});

test("S232B.1 records the Figma, truth, privacy, and rollback boundaries", () => {
  for (const node of ["48:75", "48:15", "48:25", "48:35", "48:45", "48:55", "48:65"]) {
    assert.ok(qa.includes(`\`${node}\``));
  }
  assert.match(qa, /confirmed_record.*Verified/);
  assert.match(qa, /needs_review.*NeedsReview/);
  assert.match(qa, /conflict.*Conflict/);
  assert.match(qa, /offline.*unavailable.*neutral fallback/);
  assert.match(qa, /never converts `!learnerConfirmed`/);
  assert.match(qa, /350px content width inside 20px page edges/);
  assert.match(qa, /680px reading column, 32px gutter, 288px evidence rail/);
  assert.match(qa, /metadata JSON/);
  assert.match(qa, /## Rollback/);
});

test("S232B.1 exact-head workflow is PR-scoped and publishes metadata only", () => {
  assert.match(workflow, /pull_request\.number == 582/);
  assert.match(workflow, /agent\/s232b1-trust-evidence-bar-parity/);
  assert.match(workflow, /run-s232b1-auth-e2e/);
  assert.match(workflow, /inverge-git-agent-s232b1-trust-ev-8fe8bf-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /tests\/e2e\/s232b1-trust-evidence-bar\.spec\.ts/);
  assert.match(workflow, /tests\/e2e\/s232b1-authenticated-runtime\.spec\.ts/);
  assert.match(workflow, /Postflight deployment SHA mismatch/);
  assert.match(workflow, /Exactly one S232B\.1 manifest is required/);
  assert.match(workflow, /unexpected top-level key/);
  assert.match(workflow, /unexpected viewport key/);
  assert.match(workflow, /path: s232b1-evidence\/s232b1-runtime\.json/);
  assert.doesNotMatch(workflow, /extraHTTPHeaders/);
});

test("S232B.1 runtime uses stable disclosure selectors and a persisted confirmed test fixture", () => {
  assert.match(browserRuntime, /width: 720, height: 1024, pageEdge: "20px"/);
  assert.match(browserRuntime, /getByTestId\("trust-evidence-Verified-Collapsed"\)/);
  assert.doesNotMatch(
    browserRuntime,
    /const bar = page\.locator\('\[data-v3-state="Verified"\]\[data-v3-view="Collapsed"\]'\)/,
  );
  assert.match(authRuntime, /createConfirmedSyntheticDetailHref/);
  assert.match(authRuntime, /user_confirmed_fields:[\s\S]*hasManualCorrection: true,[\s\S]*ocrConfirmedByLearner: true/);
  assert.match(authRuntime, /findEvidenceBackedStudyLedgerDetailHref/);
  assert.match(authRuntime, /normal item API/);
  assert.doesNotMatch(authRuntime, /screenshotCaptured: true|traceCaptured: true|videoCaptured: true/);
});
