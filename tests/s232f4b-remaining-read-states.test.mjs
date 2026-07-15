import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  countDegradedCoreRouteReads,
  resolveEssentialCoreRouteRead,
  resolveOptionalCoreRouteRead,
} from "../lib/review-os/core-route-read-outcome.ts";

const read = (relativePath) => readFileSync(relativePath, "utf8");

const agendaPage = read("app/app/agenda/page.tsx");
const agendaClient = read("components/review-os/learning-agenda-client.tsx");
const weeklyPage = read("app/app/weekly/page.tsx");
const routeState = read("components/review-os/core-route-read-state.tsx");
const readOutcome = read("lib/review-os/core-route-read-outcome.ts");

test("S232F.4b keeps access gates ahead of every Agenda and Weekly account read", () => {
  for (const [name, source, firstRead] of [
    ["Agenda", agendaPage, '"agenda_items"'],
    ["Weekly", weeklyPage, '"weekly_plan"'],
  ]) {
    const accessGate = source.indexOf('if (access.status !== "allowed")');
    const readIndex = source.indexOf(firstRead);
    assert.ok(accessGate >= 0, `${name} lost the S232F.2 access gate`);
    assert.ok(readIndex > accessGate, `${name} reads account records before access is allowed`);
  }

  assert.doesNotMatch(agendaPage, /\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(weeklyPage, /\.catch\(\(\) => (?:\[\]|null|\(\{ queue: \[\] \}\))/);
});

test("S232F.4b makes all record-bearing Agenda reads essential before Empty", () => {
  for (const source of ["agenda_items", "agenda_review_queue", "agenda_usage_events"]) {
    assert.match(
      agendaPage,
      new RegExp(`resolveEssentialCoreRouteRead\\(\\s*"${source}"`, "s"),
    );
  }

  const readinessGuard = agendaPage.indexOf('itemsRead.status !== "ready"');
  const eventBuild = agendaPage.indexOf("buildLearningAgendaEvents({");
  assert.ok(readinessGuard >= 0 && eventBuild > readinessGuard);
  assert.match(agendaPage, /return <CoreRouteReadErrorPage surface="agenda" \/>/);

  assert.match(agendaClient, /listReviewOsLocalBetaNotesWithStatus\(mode\)/);
  assert.match(
    agendaClient,
    /selectLocalBetaNotesReadOutcomeForMode\(storedLocalRead, mode\)/,
  );
  assert.match(
    agendaClient,
    /scopeLocalBetaNotesReadOutcome\([\s\S]*?mode,[\s\S]*?listReviewOsLocalBetaNotesWithStatus\(mode\)/,
  );
  assert.match(agendaClient, /localRead\.status === "ready" && !hasEvents/);
  assert.match(agendaClient, /localRead\.status === "unavailable"/);
  assert.match(agendaClient, /<CoreRouteLocalReadDegradedNotice coreRecordsVisible=\{hasEvents\} \/>/);
  assert.match(agendaClient, /localReadChecking && !hasEvents[\s\S]*?AGENDA_LOADING_EVIDENCE/);
  assert.match(agendaClient, /confirmedEmpty \? <EmptyAgendaState/);
  assert.match(agendaClient, /<FailureAwareState/);
  assert.doesNotMatch(agendaClient, /listReviewOsLocalBetaNotes\(/);
});

test("S232F.4b separates Weekly essential plan failure from bounded optional degradation", () => {
  assert.match(
    weeklyPage,
    /resolveEssentialCoreRouteRead\("weekly_plan"[\s\S]*?planRead\.status !== "ready"[\s\S]*?<CoreRouteReadErrorPage surface="weekly"/,
  );
  for (const source of [
    "weekly_learning_signal_summary",
    "weekly_learning_signal_events",
    "weekly_focus",
  ]) {
    assert.match(
      weeklyPage,
      new RegExp(`resolveOptionalCoreRouteRead(?:<[^;]+?>)?\\(\\s*"${source}"`, "s"),
    );
  }
  assert.match(weeklyPage, /countDegradedCoreRouteReads\(\[/);
  assert.match(weeklyPage, /<CoreRouteReadDegradedNotice count=\{degradedReadCount\} \/>/);
  assert.match(weeklyPage, /if \(plan\.tasks\.length === 0\)/);
  assert.match(weeklyPage, /<CoreRouteReadEmptyShell[\s\S]*?surface="weekly"/);
  assert.match(weeklyPage, /includeBrowserLocalRecords=\{false\}/);
  assert.match(weeklyPage, /data-s232f4b-weekly-confirmed-empty/);
  assert.match(weeklyPage, /이번 주 작업은 최대 3개만 먼저 제시합니다/);
});

test("S232F.4b read outcomes remain typed and log metadata only", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);

  try {
    const essential = await resolveEssentialCoreRouteRead("agenda_items", async () => {
      throw new Error("raw learner text and learner@example.test");
    });
    const optional = await resolveOptionalCoreRouteRead(
      "weekly_learning_signal_events",
      async () => {
        throw new Error("private answer payload");
      },
      () => [],
    );

    assert.deepEqual(essential, {
      status: "unavailable",
      retryable: true,
      safety: { kind: "unknown", preservationKnown: false },
    });
    assert.deepEqual(optional, {
      status: "degraded",
      value: [],
      reason: "optional_read_unavailable",
    });
    assert.equal(countDegradedCoreRouteReads([optional]), 1);
    assert.deepEqual(warnings, [
      [
        "[review-os] core route read unavailable",
        { source: "agenda_items", criticality: "essential" },
      ],
      [
        "[review-os] core route read unavailable",
        { source: "weekly_learning_signal_events", criticality: "optional" },
      ],
    ]);
    assert.doesNotMatch(JSON.stringify(warnings), /raw learner|learner@example|private answer/);
  } finally {
    console.warn = originalWarn;
  }
});

test("S232F.4b reuses F0 Loading, Empty, Error and accessible recovery contracts", () => {
  const agendaLoading = read("app/app/agenda/loading.tsx");
  const weeklyLoading = read("app/app/weekly/loading.tsx");

  assert.match(agendaLoading, /CoreRouteReadLoadingPage surface="agenda"/);
  assert.match(agendaLoading, /data-s230-state="loading"/);
  assert.match(weeklyLoading, /CoreRouteReadLoadingPage surface="weekly"/);
  assert.match(routeState, /agenda:[\s\S]*?title: "학습 기록"/);
  assert.match(routeState, /weekly:[\s\S]*?title: "이번 주 계획"/);
  assert.match(routeState, /role="status"/);
  assert.match(routeState, /aria-live="polite"/);
  assert.match(routeState, /window\.location\.reload\(\)/);
  assert.match(routeState, /includeBrowserLocalRecords[\s\S]*?\? browserLocalRecordState[\s\S]*?: "empty"/);
  assert.match(agendaClient, /<FailureAwareState[\s\S]*?AGENDA_EMPTY_EVIDENCE/);
  assert.match(agendaClient, /min-h-11/);
  assert.match(weeklyPage, /buttonVariants\(\{ className: "w-full sm:w-auto" \}\)/);
});

test("S232F.4b stays bounded to read truth and registers its verification", () => {
  const doc = read("docs/qa/s232f4b-remaining-read-states.md");
  const runner = read("scripts/run-node-tests.mjs");
  const combined = [agendaPage, agendaClient, weeklyPage, routeState, readOutcome, doc].join("\n");

  assert.match(doc, /Agenda.*Weekly/is);
  assert.match(doc, /Empty.*essential.*zero/is);
  assert.match(doc, /browser-local.*unavailable/is);
  assert.match(doc, /no production fault injection/i);
  assert.match(doc, /no schema, API, auth, environment, provider, ranking, or data-semantics change/i);
  assert.ok(runner.includes("tests/s232f4b-remaining-read-states.test.mjs"));
  assert.doesNotMatch(combined, /S232F4B_(?:FORCE|FAULT)|forceReadFailure|faultInjection/);
  assert.doesNotMatch(combined, /rawOcrText|rawAnswerText|rawQuestionText|rawProblemText/);
});
