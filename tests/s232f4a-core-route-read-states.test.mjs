import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CORE_ROUTE_READ_SOURCES,
  countDegradedCoreRouteReads,
  readyEssentialCoreRouteRead,
  resolveEssentialCoreRouteRead,
  resolveOptionalCoreRouteRead,
} from "../lib/review-os/core-route-read-outcome.ts";
import {
  createCheckingLocalBetaNotesReadOutcome,
  listReviewOsLocalBetaNotesWithStatus,
  saveReviewOsLocalBetaNoteWithStatus,
  scopeLocalBetaNotesReadOutcome,
  selectLocalBetaNotesReadOutcomeForMode,
} from "../lib/review-os/browser-storage.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");

const todayPage = read("app/app/page.tsx");
const reviewPage = read("app/app/review/page.tsx");
const itemsPage = read("app/app/items/page.tsx");
const routeState = read("components/review-os/core-route-read-state.tsx");
const localReflection = read("components/review-os/local-beta-note-reflection.tsx");
const readOutcome = read("lib/review-os/core-route-read-outcome.ts");

test("S232F.4a returns typed essential and optional read outcomes without logging learner data", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);

  try {
    const ready = await resolveEssentialCoreRouteRead("today_items", async () => ["record-1"]);
    const unavailable = await resolveEssentialCoreRouteRead("review_queue", async () => {
      throw new Error("private learner payload: learner@example.test");
    });
    const optionalReady = await resolveOptionalCoreRouteRead(
      "today_weekly_summary",
      async () => ({ count: 2 }),
      () => ({ count: 0 }),
    );
    const degraded = await resolveOptionalCoreRouteRead(
      "review_capture_details",
      async () => {
        throw new Error("private answer content");
      },
      () => ({}),
    );

    assert.deepEqual(ready, { status: "ready", value: ["record-1"] });
    assert.deepEqual(unavailable, {
      status: "unavailable",
      retryable: true,
      safety: { kind: "unknown", preservationKnown: false },
    });
    assert.deepEqual(optionalReady, { status: "ready", value: { count: 2 } });
    assert.deepEqual(degraded, {
      status: "degraded",
      value: {},
      reason: "optional_read_unavailable",
    });
    assert.equal(countDegradedCoreRouteReads([optionalReady, degraded]), 1);
    assert.equal(Object.isFrozen(unavailable), true);
    assert.equal(Object.isFrozen(unavailable.safety), true);
    assert.equal(Object.isFrozen(degraded), true);

    assert.deepEqual(warnings, [
      [
        "[review-os] core route read unavailable",
        { source: "review_queue", criticality: "essential" },
      ],
      [
        "[review-os] core route read unavailable",
        { source: "review_capture_details", criticality: "optional" },
      ],
    ]);
    assert.doesNotMatch(JSON.stringify(warnings), /learner@example|private learner|private answer/);
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(readyEssentialCoreRouteRead(null), { status: "ready", value: null });
  assert.deepEqual(CORE_ROUTE_READ_SOURCES, [
    "today_focus",
    "today_items",
    "today_learning_signal_events",
    "today_daily_activity",
    "today_recent_study_log",
    "today_plan_tasks",
    "today_weekly_summary",
    "today_learning_signal_summary",
    "today_question_references",
    "review_queue",
    "review_calculator_candidates",
    "review_capture_details",
    "notes_items",
    "notes_learning_signal_events",
    "agenda_items",
    "agenda_review_queue",
    "agenda_usage_events",
    "weekly_plan",
    "weekly_learning_signal_summary",
    "weekly_learning_signal_events",
    "weekly_focus",
  ]);
});

test("S232F.4a gates essential core reads after S232F.2 access and maps failures to retryable Error", () => {
  const routeContracts = [
    {
      name: "Today",
      source: todayPage,
      firstRead: '"today_focus"',
      error: '<CoreRouteReadErrorPage surface="today" />',
      essentials: [
        "today_focus",
        "today_items",
        "today_learning_signal_events",
        "today_daily_activity",
        "today_recent_study_log",
        "today_plan_tasks",
      ],
    },
    {
      name: "Review",
      source: reviewPage,
      firstRead: '"review_queue"',
      error: '<CoreRouteReadErrorPage surface="review" />',
      essentials: ["review_queue", "review_calculator_candidates"],
    },
    {
      name: "Notes/items",
      source: itemsPage,
      firstRead: '"notes_items"',
      error: '<CoreRouteReadErrorPage surface={isNotesRoute ? "notes" : "items"} />',
      essentials: ["notes_items", "notes_learning_signal_events"],
    },
  ];

  for (const contract of routeContracts) {
    const accessGate = contract.source.indexOf('if (access.status !== "allowed")');
    const firstRead = contract.source.indexOf(contract.firstRead);
    assert.ok(accessGate >= 0, `${contract.name} lost its S232F.2 access gate`);
    assert.ok(firstRead > accessGate, `${contract.name} reads learner data before the access gate`);
    assert.ok(contract.source.includes(contract.error), `${contract.name} lacks the F0 Error boundary`);
    for (const essential of contract.essentials) {
      assert.match(contract.source, new RegExp(`resolveEssentialCoreRouteRead(?:<[^;]+?>)?\\(\\s*"${essential}"`, "s"));
    }
    assert.doesNotMatch(contract.source, /\.catch\(\(\) => (?:\[\]|null|DEFAULT_DAILY_STUDY_ACTIVITY|buildFallbackTodayFocus)/);
  }

  assert.doesNotMatch(todayPage, /buildFallbackTodayFocus|DEFAULT_DAILY_STUDY_ACTIVITY/);
  assert.match(routeState, /kind: "error"/);
  assert.match(routeState, /retryable: true/);
  assert.match(routeState, /kind: "unknown", preservationKnown: false/);
  assert.match(routeState, /window\.location\.reload\(\)/);
});

test("S232F.4a asserts Empty only after every route-specific essential read succeeds with zero records", () => {
  const todayGuard = todayPage.indexOf('focusRead.status !== "ready"');
  const todayEmpty = todayPage.indexOf("if (!hasCoreTodayRecords)");
  assert.ok(todayGuard >= 0 && todayEmpty > todayGuard);
  assert.match(
    todayPage,
    /const hasCoreTodayRecords =\s*[\s\S]*?items\.length > 0[\s\S]*?queue\.length > 0[\s\S]*?learningSignalEvents\.length > 0[\s\S]*?Boolean\(recentStudyLog\)[\s\S]*?todayPlanTasks\.length > 0[\s\S]*?dailyActivity\.savedToday[\s\S]*?dailyActivity\.completedToday/,
  );
  assert.match(todayPage, /if \(!hasCoreTodayRecords\)[\s\S]*?<CoreRouteReadEmptyShell surface="today"/);

  const reviewGuard = reviewPage.indexOf('queueRead.status !== "ready"');
  const reviewEmpty = reviewPage.indexOf("items.length === 0 && calculatorRoutineCandidates.length === 0");
  assert.ok(reviewGuard >= 0 && reviewEmpty > reviewGuard);
  assert.match(reviewPage, /<CoreRouteReadEmptyShell surface="review"/);

  const notesGuard = itemsPage.indexOf('itemsRead.status !== "ready"');
  const notesEmpty = itemsPage.indexOf("if (!hasItems && !hasLearningSignals)");
  assert.ok(notesGuard >= 0 && notesEmpty > notesGuard);
  assert.match(itemsPage, /<CoreRouteReadEmptyShell[\s\S]*?surface=\{isNotesRoute \? "notes" : "items"\}/);

  assert.match(routeState, /listReviewOsLocalBetaNotesWithStatus\(mode\)/);
  assert.match(routeState, /selectLocalBetaNotesReadOutcomeForMode\(/);
  assert.match(routeState, /browserLocalRead\.status === "ready"/);
  assert.match(routeState, /browserLocalRead\.notes\.length > 0/);
  assert.match(routeState, /localRecordState === "empty"[\s\S]*?evidence=\{EMPTY_EVIDENCE\}/);
  assert.match(routeState, /confirmedEmptyContent/);
  assert.match(routeState, /localRecordState === "unavailable"[\s\S]*?<CoreRouteLocalReadDegradedNotice \/>/);
  assert.match(routeState, /빈 상태로 표시하지 않습니다/);
  assert.match(routeState, /localRecordState === "checking"[\s\S]*?evidence=\{LOADING_EVIDENCE\}/);
});

test("S232F.4a distinguishes browser-local empty, present, and unavailable reads", () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {
      localStorage: {
        getItem: () =>
          JSON.stringify([
            {
              id: "local-beta-1",
              mode: "first",
              subjectLabel: "회계학",
              biggestGap: "조건 회상",
              nextAction: "한 번 더 풀기",
              createdAt: "2026-07-16T00:00:00.000Z",
              metadataOnly: true,
              safeUse: "closed_beta_local_note",
            },
          ]),
      },
    };
    assert.equal(listReviewOsLocalBetaNotesWithStatus("first").status, "ready");
    assert.equal(listReviewOsLocalBetaNotesWithStatus("first").notes.length, 1);
    assert.equal(listReviewOsLocalBetaNotesWithStatus("second").notes.length, 0);

    globalThis.window = {
      localStorage: {
        getItem: () => null,
      },
    };
    assert.deepEqual(listReviewOsLocalBetaNotesWithStatus("first"), {
      status: "ready",
      notes: [],
    });

    for (const storedValue of [
      "",
      "{malformed",
      JSON.stringify({ notes: [] }),
      JSON.stringify([null]),
      JSON.stringify([{}]),
      JSON.stringify([
        {
          id: "local-beta-invalid",
          mode: "third",
          subjectLabel: "회계학",
          sourceType: "audio",
          biggestGap: "조건 회상",
          nextAction: "한 번 더 풀기",
          createdAt: "2026-07-16T00:00:00.000Z",
          metadataOnly: false,
          safeUse: "unexpected",
        },
      ]),
    ]) {
      globalThis.window = {
        localStorage: {
          getItem: () => storedValue,
        },
      };
      assert.deepEqual(listReviewOsLocalBetaNotesWithStatus(), {
        status: "unavailable",
        notes: [],
      });
    }

    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("storage unavailable");
        },
      },
    };
    assert.deepEqual(listReviewOsLocalBetaNotesWithStatus("first"), {
      status: "unavailable",
      notes: [],
    });

    assert.match(localReflection, /listReviewOsLocalBetaNotesWithStatus\(mode\)/);
    assert.match(localReflection, /readStatus === "checking"/);
    assert.match(localReflection, /readStatus === "unavailable"/);
    assert.match(localReflection, /<CoreRouteLocalReadDegradedNotice coreRecordsVisible \/>/);
    assert.match(localReflection, /hasDurableSummary && outcome\.status !== "unavailable"/);
    assert.match(todayPage, /showReadUnavailableNotice=\{false\}/);
    assert.match(reviewPage, /showReadUnavailableNotice=\{false\}/);
    assert.match(itemsPage, /showReadUnavailableNotice=\{false\}/);
    assert.match(read("lib/review-os/browser-storage.ts"), /parsed\.every\(isLocalBetaLearnerNote\)/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("S232F.4a preserves unreadable local notes and scopes client reads to the active mode", () => {
  const previousWindow = globalThis.window;
  const futureSchemaValue = JSON.stringify([
    {
      id: "local-beta-future",
      mode: "first",
      subjectLabel: "회계학",
      biggestGap: "조건 회상",
      nextAction: "한 번 더 풀기",
      createdAt: "2026-07-16T00:00:00.000Z",
      metadataOnly: true,
      safeUse: "closed_beta_local_note",
      futureSchemaField: { version: 2 },
    },
  ]);
  try {
    for (const unreadableValue of [futureSchemaValue, ""]) {
      let storedValue = unreadableValue;
      let writeCount = 0;
      globalThis.window = {
        localStorage: {
          getItem: () => storedValue,
          setItem: (_key, value) => {
            writeCount += 1;
            storedValue = value;
          },
        },
      };

      const saveResult = saveReviewOsLocalBetaNoteWithStatus({
        mode: "first",
        subjectLabel: "민법",
        biggestGap: "요건 회상",
        nextAction: "요건 1개 다시 쓰기",
      });

      assert.equal(saveResult.savedToBrowser, false);
      assert.equal(writeCount, 0);
      assert.equal(storedValue, unreadableValue);
    }

    const firstModeReady = scopeLocalBetaNotesReadOutcome("first", {
      status: "ready",
      notes: [
        {
          id: "local-beta-1",
          mode: "first",
          subjectLabel: "회계학",
          biggestGap: "조건 회상",
          nextAction: "한 번 더 풀기",
          createdAt: "2026-07-16T00:00:00.000Z",
          metadataOnly: true,
          safeUse: "closed_beta_local_note",
        },
      ],
    });
    assert.deepEqual(selectLocalBetaNotesReadOutcomeForMode(firstModeReady, "first"), firstModeReady);
    assert.deepEqual(selectLocalBetaNotesReadOutcomeForMode(firstModeReady, "second"), {
      mode: "second",
      status: "checking",
      notes: [],
    });
    assert.deepEqual(createCheckingLocalBetaNotesReadOutcome("first"), {
      mode: "first",
      status: "checking",
      notes: [],
    });

    const storageSource = read("lib/review-os/browser-storage.ts");
    assert.match(storageSource, /raw === null \? \[\] : JSON\.parse\(raw\)/);
    assert.match(storageSource, /existing\.status !== "ready"[\s\S]*?return \{ note: localNote, savedToBrowser \}/);
    assert.match(routeState, /selectLocalBetaNotesReadOutcomeForMode\(\s*storedBrowserLocalRead,\s*mode/);
    assert.match(localReflection, /selectLocalBetaNotesReadOutcomeForMode\(storedOutcome, mode\)/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("S232F.4a exposes bounded partial state for optional reads instead of fake Empty", () => {
  for (const optionalSource of [
    "today_weekly_summary",
    "today_learning_signal_summary",
    "today_question_references",
  ]) {
    assert.match(todayPage, new RegExp(`resolveOptionalCoreRouteRead[\\s\\S]*?"${optionalSource}"`));
  }
  assert.match(reviewPage, /resolveOptionalCoreRouteRead\([\s\S]*?"review_capture_details"/);
  assert.match(todayPage, /<CoreRouteReadDegradedNotice count=\{degradedReadCount\} \/>/);
  assert.match(reviewPage, /<CoreRouteReadDegradedNotice count=\{degradedReadCount\} \/>/);
  assert.match(routeState, /data-s232f4a-route-state="degraded"/);
  assert.match(routeState, /data-s232f4a-route-state="degraded-local-read"/);
  assert.match(routeState, /data-s232f4a-local-read-context=\{coreRecordsVisible/);
  assert.match(routeState, /일부 보조 정보를 불러오지 못했습니다/);
  assert.match(routeState, /보이는 핵심 기록은 사용할 수 있습니다/);
  assert.doesNotMatch(routeState, /today_weekly_summary|review_capture_details|Error:|stack trace/);
  assert.doesNotMatch(readOutcome, /catch \(error\)|console\.warn\([^\n]*error/);
});

test("S232F.4a provides F0 Loading boundaries and F0 evidence without unsupported safety claims", () => {
  const loadingContracts = [
    ["app/app/loading.tsx", "today"],
    ["app/app/review/loading.tsx", "review"],
    ["app/app/notes/loading.tsx", "notes"],
    ["app/app/items/loading.tsx", "items"],
  ];

  for (const [file, surface] of loadingContracts) {
    const source = read(file);
    assert.match(source, /CoreRouteReadLoadingPage/);
    assert.match(source, new RegExp(`surface="${surface}"`));
  }

  assert.match(routeState, /kind: "loading"[\s\S]*?kind: "not_applicable"/);
  assert.match(routeState, /kind: "empty"[\s\S]*?kind: "not_applicable"/);
  assert.match(routeState, /kind: "error"[\s\S]*?retryable: true[\s\S]*?kind: "unknown"/);
  assert.match(routeState, /<FailureAwareState/);
  assert.doesNotMatch(
    routeState,
    /저장 완료|저장되었습니다|데이터는 바뀌지 않았습니다|오프라인 저장|자동 (?:재시도|동기화)|대기열에 등록/,
  );
});

test("S232F.4a documents and registers the bounded source-level verification contract", () => {
  const doc = read("docs/qa/s232f4a-core-route-read-states.md");
  const runner = read("scripts/run-node-tests.mjs");

  assert.match(doc, /Today.*Review.*Notes\/items/is);
  assert.match(doc, /essential.*optional/is);
  assert.match(doc, /Empty.*all essential reads.*zero records/is);
  assert.match(doc, /local browser records.*fake Empty/is);
  assert.match(doc, /safety.*unknown/is);
  assert.match(doc, /no production fault injection/i);
  assert.match(doc, /no schema, API, auth, environment, or learner-data migration/i);
  assert.match(doc, /does not claim pixel parity/i);
  assert.match(doc, /runtime.*S232G/is);
  assert.ok(runner.includes("tests/s232f4a-core-route-read-states.test.mjs"));

  for (const source of [todayPage, reviewPage, itemsPage, routeState, localReflection, readOutcome]) {
    assert.doesNotMatch(source, /S232F4A_(?:FORCE|FAULT)|forceCoreReadFailure|faultInjection/);
  }
});
