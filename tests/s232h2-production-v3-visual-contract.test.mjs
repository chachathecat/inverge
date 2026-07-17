import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  collectSyntheticPayloadFailurePaths,
  summarizeSyntheticPayloadFailurePaths,
} from "./e2e/support/synthetic-payload-diagnostics.ts";

const read = (path) => readFileSync(path, "utf8");
const workflow = read(".github/workflows/s232h2-runtime.yml");
const spec = read("tests/e2e/s232h2-production-v3-visual.spec.ts");
const learnerUi = read("components/learner/learner-ui.tsx");
const answerReview = read("app/answer-review/answer-review-client.tsx");
const reviewRepository = read("lib/review-os/repository.ts");
const operatorRunbook = read("docs/inverge-closed-beta-operator-runbook.md");
const baselineSha = "35836d419161d7cfe55e3e3c088fcc4d66376a7d";
const snapshotDirectory =
  "tests/e2e/s232h2-production-v3-visual.spec.ts-snapshots";

const figmaSnapshots = [
  {
    file: "figma-mobile-ledger-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "afd49546f0554715ed4920dfc38e5913cde30d7bd52a7bece25442f4e33a07b1",
  },
  {
    file: "figma-desktop-ledger-chromium-linux.png",
    width: 1440,
    height: 1024,
    sha256: "ca596871993b272f81085ac586d3676536a2da6b7d009b4de14e95b722e9ac02",
  },
  {
    file: "figma-mobile-calculator-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "f3e9e7d3218f39eb2ef1e0d54e991346d31ddb9b9beb1e8ef3f7d4b3faa9e6a7",
  },
];

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const requiredRoutes = [
  "/",
  "/login",
  "/app?mode=second",
  "/app/capture?mode=second",
  "/answer-review?mode=second",
  "/app/review?mode=second",
  "/app/notes?mode=second",
  "/app/items/",
  "/app/session?mode=second",
  "/app/agenda?mode=second",
  "/app/weekly?mode=second",
  "/app/write?mode=second",
  "/app/calculator?mode=second&context=practice&focus=casio",
];

test("synthetic payload diagnostics expose only allowlisted schema paths and counts", () => {
  const privateValue = "PRIVATE_LEARNER_VALUE_DO_NOT_LOG";
  const privateKey = "PRIVATE_LEARNER_KEY_DO_NOT_LOG";
  const item = {
    rawPayload: {
      user_confirmed_fields: {
        subjectLabel: privateValue,
      },
      [privateKey]: privateValue,
    },
    derivedPayload: {
      concept_node_candidate: {
        retrievalPrompt: privateValue,
      },
    },
  };
  const failures = collectSyntheticPayloadFailurePaths(
    item,
    (value) => value === "allowed",
  );
  assert.deepEqual(failures, [
    "rawPayload.user_confirmed_fields.subjectLabel",
    "rawPayload.<unknown-key>",
    "derivedPayload.concept_node_candidate.retrievalPrompt",
  ]);
  const summary = summarizeSyntheticPayloadFailurePaths([
    { item, isAllowedString: (value) => value === "allowed" },
    { item, isAllowedString: (value) => value === "allowed" },
  ]);
  assert.deepEqual(summary, [
    {
      path: "derivedPayload.concept_node_candidate.retrievalPrompt",
      count: 2,
    },
    { path: "rawPayload.<unknown-key>", count: 2 },
    { path: "rawPayload.user_confirmed_fields.subjectLabel", count: 2 },
  ]);
  assert.equal(JSON.stringify({ failures, summary }).includes(privateValue), false);
  assert.equal(JSON.stringify({ failures, summary }).includes(privateKey), false);
});

test("S232H.2 is a narrow exact-head PR2 and fixed-PR1 Preview gate", () => {
  assert.match(workflow, /agent\/figma-v3-production-routes/);
  assert.ok(
    workflow.includes(`<!-- run-s232h2-visual-e2e baseline=${baselineSha} -->`),
    "missing fixed-baseline PR marker",
  );
  assert.ok(workflow.includes(`E2E_BASELINE_SHA: ${baselineSha}`));
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_RUNNER_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /deployments\?sha=\$\{target_sha\}&environment=Preview/,
  );
  assert.match(workflow, /api\/runtime\/version/);
  assert.match(workflow, /git merge-base/);
  assert.match(workflow, /\^\{tree\}/);
  assert.match(workflow, /git\/commits\/\$\{E2E_BASELINE_SHA\}/);
  assert.match(workflow, /git\/commits\/\$\{merge_base_sha\}/);
  assert.match(workflow, /current_pr_head/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASE_URL\}"/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASELINE_URL\}"/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /deployments: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.doesNotMatch(workflow, /#624|s232g|workflow_dispatch|rerun|re-run/i);
  assert.doesNotMatch(
    workflow,
    /contents: write|pull-requests: write|issues: write/,
  );
  assert.match(operatorRunbook, /`E2E_USER_B_EMAIL` \(2인 분리 검증용\)/);
  assert.match(operatorRunbook, /`E2E_USER_B_PASSWORD` \(2인 분리 검증용\)/);
  assert.match(workflow, /E2E_USER_EMAIL: \$\{\{ secrets\.E2E_USER_EMAIL \}\}/);
  assert.match(
    workflow,
    /E2E_USER_PASSWORD: \$\{\{ secrets\.E2E_USER_PASSWORD \}\}/,
  );
  assert.doesNotMatch(
    workflow,
    /E2E_USER_EMAIL: \$\{\{ secrets\.(?:E2E_USER_B_EMAIL|TEST_USER_EMAIL)/,
  );
  assert.doesNotMatch(
    workflow,
    /E2E_USER_PASSWORD: \$\{\{ secrets\.(?:E2E_USER_B_PASSWORD|TEST_USER_PASSWORD)/,
  );
});

test("S232H.2 audits all 13 production routes at 390, 768, and 1440", () => {
  for (const route of requiredRoutes) {
    assert.ok(spec.includes(route), `missing production route: ${route}`);
  }
  for (const width of [390, 768, 1440]) {
    assert.ok(
      spec.includes(`width: ${width}`),
      `missing viewport width: ${width}`,
    );
  }
  assert.match(spec, /expect\(requiredRoutes\)\.toHaveLength\(13\)/);
  assert.match(spec, /expect\(initialAuditRows\)\.toHaveLength\(39\)/);
  assert.match(spec, /window\.scrollTo\(0, 0\)/);
  assert.match(spec, /page\.locator\("main"\)/);
  assert.match(spec, /horizontalOverflow/);
  assert.match(spec, /visiblePrimaryActionCount/);
  assert.match(spec, /at most one primary action/);
  assert.match(spec, /data-s228-primary-action/);
  assert.match(spec, /data-s224v-dominant-primary-action/);
  assert.match(spec, /brandBackgrounds/);
  assert.match(spec, /visibleTargetFailures/);
  assert.match(spec, /targetRect\.width >= 44 && targetRect\.height >= 44/);
  assert.match(spec, /focusRevealTargetFailures/);
  assert.match(spec, /a\[data-v3-skip-link\]/);
  assert.match(learnerUi, /data-v3-skip-link[\s\S]{0,500}?min-h-12/);
  assert.match(answerReview, /data-v3-skip-link[\s\S]{0,500}?min-h-12/);
  assert.match(spec, /A keyboard-only skip target must reveal itself on focus/);
  assert.match(spec, /visibleViewportBoundsFailures/);
  assert.match(spec, /viewportBoundsFailureCount/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /serious.*critical/s);
  assert.match(spec, /verifyKeyboardFocus/);
  assert.match(spec, /waitForFunction/);
  assert.match(spec, /\{ timeout: 1_000 \}/);
  assert.match(spec, /completedFocusTraversal/);
  assert.match(spec, /state\.focusIndex === firstFocusIndex/);
  assert.match(spec, /completionKind/);
  assert.match(spec, /browser-cycle/);
  assert.match(spec, /enumerated-stops/);
  assert.match(spec, /document-exit/);
  assert.match(spec, /if \(visitedFocusIndexes\.size > 0\)/);
  assert.match(spec, /candidate\.tabIndex >= 0/);
  assert.match(spec, /visitedFocusIndexes\.size >= state\.focusableCount/);
  assert.match(spec, /visitedFocusStopCount/);
  assert.match(spec, /element\.focus\(\{ preventScroll: true \}\)/);
  assert.match(spec, /const skipLinks = page\.locator/);
  assert.match(spec, /previousScrollBehavior/);
  assert.match(spec, /everyFocusVisible/);
  assert.match(spec, /visitedFocusIndexes/);
  assert.match(spec, /element\.matches\(":focus-visible"\)/);
  assert.match(spec, /page\.keyboard\.press\("Enter"\)/);
  assert.match(spec, /enabledPrimaryReached/);
  assert.match(spec, /style\.position === "fixed"/);
  assert.match(spec, /component.*StickyAction/s);
  assert.match(spec, /gradientCount/);
  assert.match(spec, /shadowCount/);
  assert.match(spec, /shadowElements/);
  assert.match(spec, /viewport\.width === 1440/);
  assert.match(spec, /rgb\(247, 246, 243\)/);
  assert.match(spec, /Noto Sans KR/);
  assert.match(spec, /--layout-page-edge/);
  assert.match(spec, /--control-height/);
  assert.match(spec, /--v3-radius-control/);
  assert.match(spec, /--layout-reading-column/);
  assert.match(spec, /--layout-content-max/);
  assert.match(spec, /must not redirect to a different pathname/);
});

test("route mapping claims only component contracts used by that production flow", () => {
  const mappingStart = spec.indexOf("const routeContractNodes");
  const mappingEnd = spec.indexOf("\n};", mappingStart);
  assert.ok(mappingStart >= 0 && mappingEnd > mappingStart);
  const mapping = spec.slice(mappingStart, mappingEnd + 3);
  const readNodes = (route) => {
    const key = route.includes("-") ? `"${route}"` : route;
    const match = mapping.match(
      new RegExp(`(?:^|\\n)\\s*${key}:\\s*\\[([\\s\\S]*?)\\],`),
    );
    assert.ok(match, `missing route contract mapping: ${route}`);
    return [...match[1].matchAll(/"(\d+:\d+)"/g)].map((entry) => entry[1]);
  };
  const foundations = ["43:2", "44:9", "45:2"];
  const shared = ["61:2", "61:80"];
  const expected = {
    home: [...foundations, ...shared],
    login: [...foundations, ...shared],
    today: [...foundations, ...shared],
    capture: [...foundations, "48:75", "50:59", ...shared],
    "answer-review": [...foundations, "48:75", "50:59", ...shared],
    review: [...foundations, ...shared],
    notes: [...foundations, "50:59", ...shared],
    ledger: [
      ...foundations,
      "47:28",
      "48:75",
      "50:59",
      "51:44",
      "52:42",
      "56:2",
      "59:62",
      ...shared,
    ],
    session: [...foundations, "50:59", ...shared],
    agenda: [...foundations, ...shared],
    weekly: [...foundations, ...shared],
    write: [...foundations, "50:59", ...shared],
    calculator: [
      ...foundations,
      "48:75",
      "51:44",
      "53:129",
      "57:34",
      ...shared,
    ],
  };
  for (const [route, nodes] of Object.entries(expected)) {
    assert.deepEqual(readNodes(route), nodes, `false component claim: ${route}`);
  }
});

test("review queue keeps canonical ranking while scanning past orphaned source rows", () => {
  const listReviewQueue = reviewRepository.slice(
    reviewRepository.indexOf("  async listReviewQueue(userId: string, limit = 10)"),
    reviewRepository.indexOf("\n  async archiveReviewQueueItemsForMode", reviewRepository.indexOf("  async listReviewQueue(userId: string, limit = 10)")),
  );
  assert.match(listReviewQueue, /const maxScannedRows = 500/);
  assert.match(listReviewQueue, /\.eq\("source_kind", "wrong_answer"\)/);
  assert.match(listReviewQueue, /\.not\("source_submission_id", "is", null\)/);
  assert.match(listReviewQueue, /\.order\("priority_score", \{ ascending: false \}\)/);
  assert.match(listReviewQueue, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(listReviewQueue, /\.order\("id", \{ ascending: false \}\)/);
  assert.match(listReviewQueue, /\.range\(offset, rangeEnd\)/);
  assert.match(listReviewQueue, /if \(!item\) continue;/);
  assert.match(listReviewQueue, /if \(cards\.length === requestedLimit\) break;/);
  assert.match(listReviewQueue, /return cards;/);
  assert.doesNotMatch(listReviewQueue, /\.limit\(limit\)/);
  assert.match(spec, /confidence: queueAnchor \? "낮음" : "중간"/);
  assert.match(spec, /item\.confidence === "낮음" &&\s*\n\s*h2AcceptanceMarkers\(item, "queue-anchor"\)/);
  assert.match(spec, /timeSpentSeconds: queueAnchor \? 180 : undefined/);
});

test("S232H.2 pins the three canonical Figma representative PNGs", () => {
  for (const snapshot of figmaSnapshots) {
    const buffer = readFileSync(`${snapshotDirectory}/${snapshot.file}`);
    assert.deepEqual(pngDimensions(buffer), {
      width: snapshot.width,
      height: snapshot.height,
    });
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      snapshot.sha256,
    );
  }
});

test("S232H.2 produces the fixed initial, dynamic, before, and Figma evidence set", () => {
  assert.match(spec, /isAllRouteMobileEvidence = viewport\.width === 390/);
  assert.match(spec, /route\.id === "today" \|\| route\.id === "ledger"/);
  assert.match(spec, /viewport\.width === 1440 && route\.id === "ledger"/);
  assert.match(spec, /expect\(initialAuditRows\)\.toHaveLength\(39\)/);
  assert.match(spec, /expect\(dynamicAuditRows\)\.toHaveLength\(6\)/);
  assert.match(spec, /expect\(auditRows\)\.toHaveLength\(45\)/);
  assert.match(spec, /expect\(initialAfterScreenshots\)\.toHaveLength\(16\)/);
  assert.match(spec, /expect\(dynamicScreenshots\)\.toHaveLength\(6\)/);
  assert.match(spec, /expect\(afterScreenshots\)\.toHaveLength\(22\)/);
  assert.match(spec, /expect\(baselineScreenshots\)\.toHaveLength\(3\)/);
  assert.match(spec, /const figmaReferenceScreenshots = figmaReferences\.map/);
  assert.match(spec, /expect\(figmaComparisons\)\.toHaveLength\(3\)/);
  assert.match(
    spec,
    /expect\.soft\(figmaComparisons\.every\(\(comparison\) => comparison\.passed\)\)\.toBe\(true\)/,
  );
  assert.match(spec, /expect\(screenshotNames\)\.toHaveLength\(28\)/);
  assert.match(spec, /s232h2-before-ledger-/);
  assert.match(spec, /s232h2-before-calculator-390\.png/);
  assert.match(spec, /s232h2-after-\$\{route\.id\}-\$\{viewport\.label\}\.png/);
  assert.match(spec, /advanceCalculatorToCasioInput/);
  assert.match(
    spec,
    /gotoRequiredRoute\(page, requestedPath\)[\s\S]*?route\.id === "calculator" && viewport\.width === 390[\s\S]*?advanceCalculatorToCasioInput\(page\)/,
  );
  assert.match(spec, /visibleTargetFailures\(page\)/);
  assert.match(spec, /data-calculator-routine-active-step=\"casio_input\"/);
  assert.match(spec, /data-v3-component=\"CalculatorStep\"/);
  assert.match(
    spec,
    /async function captureSyntheticScreenshot[\s\S]*?setProperty\("scroll-behavior", "auto", "important"\)[\s\S]*?behavior: "instant" as ScrollBehavior[\s\S]*?document\.scrollingElement\?\.scrollTo\(instantTop\)[\s\S]*?window\.scrollTo\(instantTop\)[\s\S]*?page\.waitForFunction\([\s\S]*?window\.scrollY === 0[\s\S]*?timeout: 1_000[\s\S]*?removeProperty\("scroll-behavior"\)[\s\S]*?screenshotScrollY[\s\S]*?canonical top position/,
  );
  for (const state of [
    "capture-extraction-preview",
    "answer-review-result",
    "answer-review-rewrite",
    "review-revealed-selected",
    "session-saved-capture",
    "calculator-completed-saved",
  ]) {
    assert.ok(spec.includes(state), `missing dynamic-state evidence: ${state}`);
  }
  assert.match(workflow, /initialAuditRowCount !== 39/);
  assert.match(workflow, /dynamicAuditRowCount !== 6/);
  assert.match(workflow, /screenshotCount !== 28/);
  assert.match(workflow, /s232h2-\*\.png/);
  assert.match(workflow, /s232h2-visual-manifest\.json/);
  assert.match(
    workflow,
    /Run exact-head production V3 visual acceptance[\s\S]*?id: visual_acceptance/,
  );
  const diagnosticStart = workflow.indexOf(
    "Upload bounded representative PNG diagnostics after visual acceptance failure",
  );
  const diagnosticEnd = workflow.indexOf(
    "\n      - name: Recheck both exact deployment SHAs",
    diagnosticStart,
  );
  assert.ok(diagnosticStart >= 0 && diagnosticEnd > diagnosticStart);
  const diagnosticBlock = workflow.slice(diagnosticStart, diagnosticEnd);
  assert.match(
    diagnosticBlock,
    /if: \$\{\{ failure\(\) && steps\.visual_acceptance\.outcome == 'failure' \}\}/,
  );
  for (const fileName of [
    "s232h2-after-ledger-390.png",
    "s232h2-figma-mobile-ledger-56-2.png",
    "s232h2-after-ledger-1440.png",
    "s232h2-figma-desktop-ledger-59-62.png",
    "s232h2-after-calculator-390.png",
    "s232h2-figma-mobile-calculator-57-34.png",
  ]) {
    assert.ok(
      diagnosticBlock.includes(`test-results/**/${fileName}`),
      `missing bounded visual diagnostic: ${fileName}`,
    );
  }
  assert.equal(
    [...diagnosticBlock.matchAll(/test-results\/\*\*\/s232h2-[a-z0-9-]+\.png/g)]
      .length,
    6,
  );
  assert.match(diagnosticBlock, /if-no-files-found: warn/);
  assert.match(diagnosticBlock, /retention-days: 7/);
  assert.doesNotMatch(
    diagnosticBlock,
    /s232h2-\*\.png|manifest|trace\.zip|\.webm|playwright-report/,
  );
  assert.doesNotMatch(
    workflow,
    /test-results\/\*\*\/\*\.png|trace\.zip|playwright-report/,
  );
});

test("S232H.2 evidence is privacy-bounded synthetic data and directly compared with Figma", () => {
  assert.match(spec, /loginWithDedicatedTestAccount/);
  assert.match(spec, /ensureSyntheticLedgerFixture/);
  assert.ok(spec.includes('"/api/auth/session"'));
  assert.ok(spec.includes('"/api/os/items?limit=501"'));
  assert.ok(spec.includes('"/api/os/study-logs?mode=second&limit=501"'));
  assert.ok(spec.includes('"/api/os/review-queue"'));
  assert.ok(spec.includes('"/api/os/today-focus?mode=second"'));
  assert.ok(spec.includes('"/api/os/weekly-summary?mode=second"'));
  assert.match(spec, /\/api\/os\/items\/\$\{encodeURIComponent\(itemId\)\}/);
  assert.match(
    spec,
    /context\(\)[\s\S]{0,40}?\.request\.post\("\/api\/os\/items"/,
  );
  assert.match(spec, /S232H2 synthetic visual acceptance/);
  assert.match(spec, /s232h2:v3-visual:v1/);
  assert.match(spec, /s232h2:v3-visual:ledger:v2/);
  assert.match(spec, /s232h2:v3-visual:ledger:v1/);
  assert.match(spec, /isHistoricalH2LedgerV1/);
  assert.match(spec, /isHistoricalS232gAggregateSource/);
  assert.match(spec, /isHistoricalS232gAggregateRewrite/);
  assert.match(spec, /historicalS232gRewriteParagraph/);
  assert.match(spec, /audit\.items\.find\(isCurrentH2Ledger\)/);
  const currentLedgerClassifier = spec.slice(
    spec.indexOf("function isCurrentH2Ledger"),
    spec.indexOf("function isHistoricalH2LedgerV1"),
  );
  const currentQueueClassifier = spec.slice(
    spec.indexOf("function isH2QueueAnchor"),
    spec.indexOf("function isHistoricalH2QueueAnchor"),
  );
  const historicalLedgerClassifier = spec.slice(
    spec.indexOf("function isHistoricalH2LedgerV1"),
    spec.indexOf("function isLegacyH2Ledger"),
  );
  assert.match(currentLedgerClassifier, /hasExplicitUnconfirmedFields\(item\)/);
  assert.match(currentQueueClassifier, /hasExplicitUnconfirmedFields\(item\)/);
  assert.match(
    historicalLedgerClassifier,
    /hasHistoricalAbsentConfirmationFields\(item\)/,
  );
  assert.match(
    spec,
    /function hasExplicitUnconfirmedFields[\s\S]*?hasManualCorrection === false[\s\S]*?ocrConfirmedByLearner === false/,
  );
  assert.match(spec, /hasHistoricalAbsentConfirmationFields/);
  assert.match(spec, /acceptance_fixture_id/);
  assert.match(spec, /acceptance_fixture_role/);
  assert.match(spec, /isExactSyntheticRoot/);
  assert.match(spec, /isOwnedSyntheticRewrite/);
  assert.match(spec, /item\.subjectLabel !== parent\.subjectLabel/);
  assert.match(spec, /item\.sourceType !== parent\.sourceType/);
  assert.match(spec, /item\.confidence !== parent\.confidence/);
  assert.match(spec, /hasExactSyntheticPayloadContract/);
  assert.match(spec, /exactSyntheticPayloadFailurePaths/);
  assert.match(spec, /summarizeSyntheticPayloadFailurePaths/);
  assert.match(spec, /schema paths and counts only, never values/);
  assert.match(spec, /collectSyntheticPayloadFailurePaths/);
  assert.match(spec, /exactSyntheticSystemValuePatterns\.some/);
  assert.match(spec, /concept:second:\(\?:감정평가실무/);
  assert.match(spec, /second-\(\?:practice-/);
  assert.ok(spec.includes('"local_taxonomy_v1"'));
  assert.ok(spec.includes('"low"'));
  assert.ok(spec.includes('"답안 구조 점검(점검 필요)"'));
  assert.ok(spec.includes('"구조"'));
  assert.ok(spec.includes('"사안포섭"'));
  assert.ok(spec.includes('"쟁점 구조화"'));
  assert.ok(spec.includes('"포섭 논증"'));
  assert.ok(spec.includes('"쟁점 누락"'));
  assert.ok(spec.includes('"규범-사실 연결 부족"'));
  assert.ok(
    spec.includes(
      '"공적 견해표명에 해당하는 사실을 구체적으로 연결해야 합니다."',
    ),
  );
  assert.ok(
    spec.includes(
      '"curriculum-capture-capture-note-second_law_project_approval_disposition"',
    ),
  );
  assert.ok(
    spec.includes(
      '"시장가치\/공정가치에서 정의\/논거\/비교\/사례 적용 키워드를 먼저 떠올려 보세요."',
    ),
  );
  assert.doesNotMatch(spec, /\\p\{Letter\}|\^second\(\?:\[-_\]/);
  assert.match(spec, /rewrite_source_item_id/);
  assert.match(spec, /const itemListingComplete = listedItems\.length < 501/);
  assert.match(spec, /const studyLogListingComplete = logs\.length < 501/);
  assert.doesNotMatch(
    spec,
    /syntheticEvidencePattern|function isSyntheticText|values\.some|const syntheticLogs = logs\.filter/,
  );
  assert.match(
    spec,
    /const strictOwnershipContract =\s*listedAccountOwnedItems\.length === listedItems\.length &&\s*detailOwnershipClosed &&\s*logs\.length === 0/,
  );
  assert.match(
    spec,
    /const detailOwnershipClosed = detailItems\.every\([\s\S]*?item\.userId === sessionUserId &&[\s\S]*?listedAccountOwnedIds\.has\(resolveSyntheticItemId\(item\)\)/,
  );
  assert.match(spec, /syntheticQueue = queue\.filter[\s\S]*?owned\.has\(item\.itemId\)/);
  assert.match(spec, /planningIds\.today\.filter\(\(itemId\) =>\s*owned\.has\(itemId\)/);
  assert.match(
    spec,
    /planningIds\.weekly\.every\([\s\S]*?listedAccountOwnedIds\.has\(itemId\)/,
  );
  assert.match(spec, /accountOwnedItemCount: listedAccountOwnedItems\.length/);
  assert.match(spec, /exactFixtureItemCount: listedExactFixtures\.length/);
  assert.match(spec, /unclassifiedAccountItemCount: unclassifiedItems\.length/);
  assert.match(spec, /historicalS232gSourceCount/);
  assert.match(spec, /historicalS232gRewriteCount/);
  assert.match(spec, /family-counts=/);
  assert.match(spec, /historical-diagnostics=/);
  assert.match(spec, /historicalS232gSourceFailureFields/);
  assert.match(spec, /historicalS232gRewriteFailureFields/);
  assert.match(spec, /payloadFailurePaths/);
  assert.match(spec, /parentRawPayload\.rewrite_instruction/);
  assert.match(spec, /parentAiDraft\.rewriteInstruction/);
  assert.match(spec, /const listedAccountOwnedIds = new Set/);
  assert.match(spec, /const governedTestAccount = sessionBound/);
  assert.match(spec, /item\.userId === sessionUserId/);
  assert.match(spec, /exactFixtureItemCount/);
  assert.match(spec, /governedTestAccount/);
  assert.match(spec, /detailOwnershipClosed/);
  assert.match(spec, /any study log makes capture fail closed/);
  assert.match(
    spec,
    /const preMutationAudit = await auditSyntheticAccount[\s\S]*?const initialAfterScreenshots/,
  );
  assert.match(spec, /accountItemCount/);
  assert.match(spec, /accountOwnedItemCount/);
  assert.match(spec, /unclassifiedAccountItemCount/);
  assert.match(spec, /accountStudyLogCount/);
  assert.match(spec, /syntheticFixtureReady/);
  assert.match(spec, /accountSnapshotStable/);
  assert.match(spec, /screenshotDataBoundaryClosed/);
  assert.match(spec, /sessionBound/);
  assert.match(spec, /strictOwnershipContract/);
  assert.match(spec, /pendingOwnedQueue/);
  assert.match(spec, /queueDetailsAudited/);
  assert.match(spec, /weeklyTaskDetailsAudited/);
  assert.match(spec, /privateLearnerContentCaptured/);
  assert.doesNotMatch(spec, /syntheticAccountOnly|syntheticFixtureOnly/);
  assert.doesNotMatch(spec, /privateLearnerContentCaptured:\s*false/);
  assert.match(spec, /createScreenshotDataBoundary/);
  assert.match(spec, /const unclassifiedItems = listedItems\.filter/);
  assert.match(spec, /NodeFilter\.SHOW_TEXT/);
  assert.match(spec, /Array\.from\(element\.attributes\)/);
  assert.match(spec, /HTMLInputElement/);
  assert.match(spec, /"::before", "::after"/);
  assert.match(spec, /visibleUninspectableSurfaceCount/);
  assert.match(
    spec,
    /await assertScreenshotDataBoundary\(\);\s*const buffer = await page\.screenshot\([\s\S]*?await assertScreenshotDataBoundary\(\);\s*boundary\.captureCount/,
  );
  assert.match(
    spec,
    /const finalAccountAudit = await auditSyntheticAccount[\s\S]*?accountSnapshotStable[\s\S]*?for \(const screenshot of \[\.\.\.baselineScreenshots, \.\.\.afterScreenshots\]\)[\s\S]*?await writeFile/,
  );
  assert.match(spec, /screenshotBoundary\.checkCount === 50/);
  assert.match(spec, /screenshotBoundary\.captureCount === 25/);
  assert.doesNotMatch(spec, /JSON\.stringify\(boundary\)/);
  assert.doesNotMatch(spec, /detailRead\.itemId} must/);
  assert.doesNotMatch(spec, /textContent\?\.trim\(\)\.slice/);
  assert.match(spec, /evidence\.consoleErrors\.push\("console-error"\)/);
  assert.match(spec, /evidence\.pageErrors\.push\("page-error"\)/);
  assert.match(spec, /const credentialsRedacted =/);
  assert.match(spec, /\n\s+credentialsRedacted,\n/);
  assert.match(spec, /rawInputArtifactCaptured: false/);
  assert.match(spec, /domCaptured: false/);
  assert.match(spec, /traceCaptured: false/);
  assert.match(spec, /videoCaptured: false/);
  assert.match(spec, /maskColor: "#000000"/);
  assert.match(spec, /visibleEmailOutsideMask/);
  assert.doesNotMatch(spec, /captureSanitizedScreenshot/);
  assert.doesNotMatch(spec, /result:\s*["']pass["']/);
  assert.match(
    spec,
    /const result = acceptanceSignals\.every\(Boolean\) \? "pass" : "fail"/,
  );
  assert.match(spec, /\n\s+result,\n/);

  for (const snapshotName of [
    "figma-mobile-ledger.png",
    "figma-desktop-ledger.png",
    "figma-mobile-calculator.png",
  ]) {
    assert.ok(
      spec.includes(snapshotName),
      `missing direct comparison: ${snapshotName}`,
    );
  }
  assert.match(spec, /compareScreenshotToFigmaReference/);
  assert.match(spec, /testInfo\.snapshotPath\(reference\.snapshotName\)/);
  assert.match(spec, /const buffer = await page\.screenshot/);
  assert.match(spec, /actual\.buffer\.toString\("base64"\)/);
  assert.match(spec, /context\.getImageData/);
  assert.match(
    spec,
    /metrics\.meanColorDelta[\s\S]*?toBeLessThanOrEqual\(0\.18\)/,
  );
  assert.match(
    spec,
    /metrics\.nearPixelRatio[\s\S]*?toBeGreaterThanOrEqual\(0\.5\)/,
  );
  assert.match(spec, /cellRgbMeanAbsoluteError/);
  assert.match(spec, /cellOccupancyMeanAbsoluteError/);
  assert.match(spec, /edgeGridCorrelation/);
  assert.match(spec, /edgeEnergyRatio/);
  assert.match(spec, /dilatedEdgeF1/);
  assert.match(spec, /anchorMaxRgbMeanDelta/);
  assert.match(spec, /anchorMinEdgeDensityRatio/);
  assert.match(spec, /anchorsByNode/);
  assert.match(spec, /verifyRepresentativeFigmaStructure/);
  assert.match(spec, /data-s232d2-state-evidence/);
  assert.match(spec, /data-s232d2-recovery-heading/);
  assert.match(spec, /이번에 회복할 문장/);
  assert.match(spec, /spatial edge-grid correlation/);
  assert.match(
    spec,
    /expect\.soft\(\s*metrics\.edgeGridCorrelation,[\s\S]*?toBeGreaterThanOrEqual\(0\.5\)/,
  );
  assert.match(
    spec,
    /expect\.soft\(\s*passed,[\s\S]*?must satisfy every direct Figma comparison threshold/,
  );
  assert.match(spec, /const passed =/);
  assert.match(spec, /figmaComparisons/);
  assert.match(spec, /meanColorDelta/);
  assert.match(spec, /nearPixelRatio/);
  assert.match(spec, /figmaComparisonCount/);

  for (const node of [
    "43:2",
    "44:9",
    "45:2",
    "47:28",
    "48:75",
    "50:59",
    "51:44",
    "52:42",
    "53:129",
    "56:2",
    "57:34",
    "59:62",
    "61:2",
    "61:80",
  ]) {
    assert.ok(
      spec.includes(`"${node}"`),
      `missing Figma node mapping: ${node}`,
    );
  }
  assert.match(spec, /calculatorCasioInputVisible:\s*initialAuditRows\.some/);
  assert.match(workflow, /screenshotDataBoundaryClosed/);
  assert.match(workflow, /visibleUnclassifiedTextHitCount/);
  assert.match(workflow, /strictOwnershipContract/);
  assert.match(workflow, /edgeGridCorrelation/);
  assert.match(workflow, /figmaComparisonCount !== 3/);
  assert.match(workflow, /rawInputArtifactCaptured !== false/);
  assert.match(workflow, /consoleErrorCount !== 0/);
  assert.match(workflow, /baselineConsoleErrorCount !== 0/);
});
