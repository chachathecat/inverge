export const S232G_VIEWPORTS = Object.freeze([
  Object.freeze({ key: "390", width: 390, height: 844 }),
  Object.freeze({ key: "768", width: 768, height: 1024 }),
  Object.freeze({ key: "1440", width: 1440, height: 1024 }),
]);

export const S232G_WIDTH_EQUIVALENT_VIEWPORT = Object.freeze({
  key: "720-width-equivalent",
  width: 720,
  height: 1024,
});

export const S232G_ROUTES = Object.freeze([
  Object.freeze({
    key: "today",
    pathname: "/app",
    evidenceRoute: "/app?mode=second",
    href: "/app?mode=second",
    readySelector: '[data-s232d5-today-page="single-priority"]',
    keyboardSelector: "[data-s232d5-today-primary-cta]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "capture",
    pathname: "/app/capture",
    evidenceRoute: "/app/capture?mode=second",
    href: "/app/capture?mode=second",
    readySelector: '[data-s224v-surface="/app/capture"]',
    keyboardSelector: "[data-s226-capture-primary-action]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "write",
    pathname: "/app/write",
    evidenceRoute: "/app/write?mode=second",
    href: "/app/write?mode=second",
    readySelector: '[data-s232e-second-write-page][data-s224v-surface="/app/write"]',
    keyboardSelector: '[data-s232e-second-write-panel="1"] textarea',
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "answer-review",
    pathname: "/answer-review",
    evidenceRoute: "/answer-review?mode=second",
    href: "/answer-review?mode=second",
    readySelector: 'main#answer-review-main[data-s232e3-answer-review-entry="learner-first"]',
    keyboardSelector: 'a[href="#answer-review-main"]',
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "notes",
    pathname: "/app/notes",
    evidenceRoute: "/app/notes?mode=second",
    href: "/app/notes?mode=second",
    readySelector: '[data-s232d3-notes-list="recent-first"]',
    keyboardSelector: "[data-s232d3-detail-link]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "items",
    pathname: "/app/items",
    evidenceRoute: "/app/items?mode=second",
    href: "/app/items?mode=second",
    readySelector: '[data-s224v-surface="/app/items"]',
    keyboardSelector: '[data-s224v-surface="/app/items"] a[href^="/app/items/"]',
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "study-ledger",
    pathname: "/app/items/[itemId]",
    evidenceRoute: "/app/items/:synthetic?mode=second",
    href: null,
    readySelector: "[data-s228-study-ledger-detail]",
    keyboardSelector: "[data-s228-primary-action]",
    parityKind: "direct-product-frame",
    directFigmaNodes: Object.freeze([
      "56:2", "56:3", "56:8", "56:47",
      "59:62", "59:63", "59:68", "59:100", "59:104",
    ]),
  }),
  Object.freeze({
    key: "review",
    pathname: "/app/review",
    evidenceRoute: "/app/review?mode=second",
    href: "/app/review?mode=second",
    readySelector: '[data-s232d4-review-page="priority-first"], [data-testid="s232f4a-review-empty-state"]',
    keyboardSelector: '[data-review-recall-input], [data-s232f4a-surface="review"] a[href^="/app/capture"]',
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "agenda",
    pathname: "/app/agenda",
    evidenceRoute: "/app/agenda?mode=second",
    href: "/app/agenda?mode=second",
    readySelector: '[data-s230-learning-record-timeline][data-s230-state="ready"], [data-s230-learning-record-timeline][data-s230-state="empty"]',
    keyboardSelector: "[data-s230-dominant-next-action]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "weekly",
    pathname: "/app/weekly",
    evidenceRoute: "/app/weekly?mode=second",
    href: "/app/weekly?mode=second",
    readySelector: '[data-s232g-route="weekly"]',
    keyboardSelector: "[data-s232g-primary-action]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "session",
    pathname: "/app/session",
    evidenceRoute: "/app/session?mode=first",
    href: "/app/session?mode=first",
    readySelector: '[data-s232g-route="session"]',
    keyboardSelector: "[data-s232g-primary-action]",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
  Object.freeze({
    key: "calculator",
    pathname: "/app/calculator",
    evidenceRoute: "/app/calculator?mode=second&context=practice&focus=casio",
    href: "/app/calculator?mode=second&context=practice&focus=casio",
    readySelector: '[data-s232g-route="calculator"]',
    keyboardSelector: '[data-s232g-route="calculator"] a[href^="/app"]',
    parityKind: "direct-component-only",
    directFigmaNodes: Object.freeze(["57:34", "57:57", "53:129"]),
  }),
  Object.freeze({
    key: "first-ox",
    pathname: "/app/first/ox",
    evidenceRoute: "/app/first/ox",
    href: "/app/first/ox",
    readySelector: '[data-s232g-route="first-ox"]',
    keyboardSelector: "#first-ox-subject",
    parityKind: "semantic-component",
    directFigmaNodes: Object.freeze([]),
  }),
]);

export const S232G_ALIASES = Object.freeze([
  Object.freeze({ pathname: "/app/today", canonicalKey: "today", evidenceRoute: "/app/today?mode=second" }),
  Object.freeze({ pathname: "/app/input", canonicalKey: "capture", evidenceRoute: "/app/input?mode=second" }),
  Object.freeze({ pathname: "/app/entry", canonicalKey: "capture", evidenceRoute: "/app/entry?mode=second" }),
  Object.freeze({ pathname: "/app/study-log", canonicalKey: "agenda", evidenceRoute: "/app/study-log?mode=second" }),
]);

export const S232G_EXCLUSIONS = Object.freeze([
  Object.freeze({ pathname: "/app/acceptance/trust-provenance/[state]", owner: "acceptance-fixture", limitation: "non-product-test-fixture" }),
  Object.freeze({ pathname: "/app/mode-migration", owner: "mode-migration", limitation: "outside-s232-learner-loop" }),
  Object.freeze({ pathname: "/app/onboarding", owner: "onboarding", limitation: "outside-authenticated-owned-routes" }),
  Object.freeze({ pathname: "/app/sets", owner: "first-round-sets", limitation: "outside-s232-second-round-loop" }),
  Object.freeze({ pathname: "/app/settings", owner: "settings", limitation: "account-settings-not-learning-loop" }),
  Object.freeze({ pathname: "/app/settings/notifications", owner: "notification-settings", limitation: "account-settings-not-learning-loop" }),
]);

export const S232G_FIGMA_FOUNDATION_NODES = Object.freeze([
  "43:2", "44:9", "45:2", "61:80",
]);

export const S232G_FIGMA_SHARED_COMPONENT_NODES = Object.freeze([
  "47:28", "48:75", "50:59", "51:44", "52:42",
]);

export const S232G_EVIDENCE_KEYS = Object.freeze([
  "commitSha",
  "deploymentSha",
  "viewport",
  "route",
  "scenario",
  "result",
  "remainingLimitation",
]);

export const S232G_SCENARIOS = Object.freeze([
  "route-parity",
  "keyboard-focus-proxy",
  "width-equivalent-reflow-proxy",
  "alias-redirect",
  "rewrite-save-before-after",
  "reload-durability",
  "notes-round-trip",
  "fresh-account-owner-read",
  "cross-account-api-denial",
  "cross-account-ui-denial",
  "cross-account-notes-absence",
  "cross-account-review-absence",
  "cross-account-today-absence",
  "owner-reread-positive-control",
  "state-announcement-proxy",
]);

export const S232G_LIMITATIONS = Object.freeze([
  "manual-visual-zoom-screen-reader-required",
  "no-direct-product-frame-manual-a11y-required",
  "not-actual-browser-zoom",
  "not-real-assistive-technology",
  "redirect-contract-only",
  "none",
]);

export const S232G_SUMMARY_KEYS = Object.freeze([
  "schemaVersion", "result", "commitSha", "deploymentSha", "rowCount",
  "canonicalRouteCount", "aliasCount", "excludedRouteCount", "viewportCount",
  "axeScanCount", "axeBlockingCount", "visibleHeadingCount",
  "keyboardRouteCount", "keyboardFailureCount", "horizontalOverflowCount",
  "nestedTwoDimensionalScrollCount", "clippedCoreContentCount",
  "consoleErrorCount", "pageErrorCount", "requestFailureCount", "httpErrorCount",
  "blockedPreviewToolbarMutationCount", "excludedPreviewToolbarConsoleErrorCount",
  "sourceCreatedCount", "durableSaveReceiptCount", "reloadComparisonCount",
  "notesRoundTripCount", "freshAccountContextCount", "crossAccountApiDenialCount",
  "crossAccountUiDenialCount", "crossAccountCollectionAbsenceCount",
  "ownerPositiveControlCount", "stateAnnouncementProxyCount",
  "directFigmaProductFrameRouteCount", "directFigmaComponentOnlyRouteCount",
  "semanticComponentOnlyRouteCount", "actualBrowserZoomClaimed",
  "realScreenReaderClaimed", "credentialsCaptured", "rawLearnerContentCaptured",
  "requestBodyCaptured", "responseBodyCaptured", "itemIdCaptured", "userIdCaptured",
  "emailCaptured", "urlCaptured", "domCaptured", "screenshotCaptured",
  "traceCaptured", "videoCaptured",
]);

export function routeParityLimitation(route) {
  return route.parityKind === "direct-product-frame"
    ? "manual-visual-zoom-screen-reader-required"
    : "no-direct-product-frame-manual-a11y-required";
}

export function buildS232GExpectedEvidenceDescriptors() {
  const rows = [];
  for (const route of S232G_ROUTES) {
    for (const viewport of S232G_VIEWPORTS) {
      rows.push({
        route: route.evidenceRoute,
        viewport: viewport.key,
        scenario: "route-parity",
        remainingLimitation: routeParityLimitation(route),
      });
    }
    rows.push({
      route: route.evidenceRoute,
      viewport: "390",
      scenario: "keyboard-focus-proxy",
      remainingLimitation: "not-real-assistive-technology",
    });
    rows.push({
      route: route.evidenceRoute,
      viewport: S232G_WIDTH_EQUIVALENT_VIEWPORT.key,
      scenario: "width-equivalent-reflow-proxy",
      remainingLimitation: "not-actual-browser-zoom",
    });
  }
  for (const alias of S232G_ALIASES) {
    rows.push({
      route: alias.evidenceRoute,
      viewport: "n/a",
      scenario: "alias-redirect",
      remainingLimitation: "redirect-contract-only",
    });
  }
  rows.push(
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "rewrite-save-before-after", remainingLimitation: "none" },
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "reload-durability", remainingLimitation: "none" },
    { route: "/app/notes?mode=second", viewport: "390", scenario: "notes-round-trip", remainingLimitation: "none" },
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "fresh-account-owner-read", remainingLimitation: "none" },
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "cross-account-api-denial", remainingLimitation: "none" },
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "cross-account-ui-denial", remainingLimitation: "none" },
    { route: "/app/notes?mode=second", viewport: "390", scenario: "cross-account-notes-absence", remainingLimitation: "none" },
    { route: "/app/review?mode=second", viewport: "390", scenario: "cross-account-review-absence", remainingLimitation: "none" },
    { route: "/app?mode=second", viewport: "390", scenario: "cross-account-today-absence", remainingLimitation: "none" },
    { route: "/app/items/:synthetic?mode=second", viewport: "390", scenario: "owner-reread-positive-control", remainingLimitation: "none" },
    { route: "/app/capture?mode=second", viewport: "390", scenario: "state-announcement-proxy", remainingLimitation: "not-real-assistive-technology" },
  );
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function s232gEvidenceCompositeKey(row) {
  return `${row.route}|${row.viewport}|${row.scenario}`;
}
