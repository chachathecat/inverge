import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("FAST OWNER PREVIEW reuses session and access reads within one server request", () => {
  const session = read("lib/auth/session.ts");
  const proxy = read("lib/supabase/proxy.ts");
  const ownerAccess = read("lib/review-os/owner-alpha-practice-access.ts");
  const repository = read("lib/review-os/repository.ts");

  assert.match(
    session,
    /const getServerSessionUserForRequest = cache\(async function getServerSessionUserForRequest/,
  );
  assert.match(
    session,
    /return getServerSessionUserForRequest\(fallbackUserId\)/,
  );
  assert.match(
    proxy,
    /await client\.auth\.getClaims\(\)/,
  );
  assert.doesNotMatch(proxy, /await client\.auth\.getUser\(\)/);
  assert.match(
    ownerAccess,
    /getServerSessionUser/,
  );
  assert.match(
    session,
    /await client\.auth\.getUser\(\)/,
    "fresh user lookup must remain available to Owner/admin allowlist callers",
  );
  assert.match(
    session,
    /const session = await getServerSessionUser\(fallbackUserId\)/,
    "learner reads must retain fresh revocation and user-state checks",
  );
  const claimsIndex = proxy.indexOf("await client.auth.getClaims()");
  const forwardedHeadersIndex = proxy.lastIndexOf(
    "const requestHeaders = new Headers(request.headers)",
  );
  assert.ok(
    forwardedHeadersIndex > claimsIndex,
    "refreshed request cookies must be forwarded to Server Components",
  );
  assert.match(
    repository,
    /const ensureReviewOsAccessForRequest = cache\(/,
  );
  assert.match(
    repository,
    /return ensureReviewOsAccessForRequest\(userId, email\)/,
  );
});

test("FAST OWNER PREVIEW keeps steady-state access read-only without weakening invite or entitlement", () => {
  const repository = read("lib/review-os/repository.ts");
  const existingProfileStart = repository.indexOf("if (existingProfile)");
  const firstTimeInsertStart = repository.indexOf(
    'const insertResult = await client.from("profiles").insert',
    existingProfileStart,
  );
  const existingProfileBlock = repository.slice(
    existingProfileStart,
    firstTimeInsertStart,
  );

  assert.ok(existingProfileStart >= 0);
  assert.ok(firstTimeInsertStart > existingProfileStart);
  assert.match(existingProfileBlock, /if \(email && email !== storedEmail\)/);
  assert.match(existingProfileBlock, /\.update\(\{\s*email,\s*updated_at:/);
  assert.doesNotMatch(existingProfileBlock, /invite_status\s*:/);
  assert.doesNotMatch(existingProfileBlock, /entitlement_tier\s*:/);
  assert.match(existingProfileBlock, /return mapAccess\(/);
});

test("FAST OWNER PREVIEW removes unused layout and page reads while retaining fresh route guards", () => {
  const layout = read("app/app/layout.tsx");
  const notes = read("app/app/items/page.tsx");
  const agenda = read("app/app/agenda/page.tsx");

  assert.match(layout, /includeProfile: false/);
  assert.match(layout, /includeUsage: false/);
  assert.match(layout, /<Suspense fallback=\{null\}>/);
  assert.match(layout, /<PrivateAccountUsage userId=\{session\.userId\} access=\{access\} \/>/);
  for (const [route, source] of [
    ["notes", notes],
    ["agenda", agenda],
  ]) {
    const contextIndex = source.indexOf("await getReviewOsServerContext(");
    const guardIndex = source.indexOf('if (access.status !== "allowed")');
    const dataIndex = source.indexOf("reviewOsService.");
    assert.ok(contextIndex >= 0, `${route} must resolve access`);
    assert.ok(guardIndex > contextIndex, `${route} must retain the fresh route gate`);
    assert.ok(dataIndex > guardIndex, `${route} must read data only after the gate`);
    assert.match(
      source,
      /includeProfile: parseAppraisalMode\(modeParam\) === null/,
    );
    assert.match(source, /includeUsage: false/);
  }
});

test("FAST OWNER PREVIEW reads learning signals only as an empty-items fallback", () => {
  const notes = read("app/app/items/page.tsx");
  const itemsIndex = notes.indexOf(
    'resolveEssentialCoreRouteRead("notes_items"',
  );
  const hasItemsIndex = notes.indexOf("const hasItems = items.length > 0");
  const signalsIndex = notes.indexOf(
    'resolveEssentialCoreRouteRead("notes_learning_signal_events"',
  );

  assert.ok(itemsIndex >= 0);
  assert.ok(hasItemsIndex > itemsIndex);
  assert.ok(signalsIndex > hasItemsIndex);
  assert.match(notes, /const learningSignalsRead = hasItems\s*\?\s*null\s*:/);
});

test("FAST OWNER PREVIEW gives Notes a mode-scoped summary query without learner payload overfetch", () => {
  const notes = read("app/app/items/page.tsx");
  const repository = read("lib/review-os/repository.ts");
  const service = read("lib/review-os/service.ts");

  assert.match(
    notes,
    /isNotesRoute\s*\?\s*reviewOsService\.listLearningNoteItems\([\s\S]*?mode,[\s\S]*?60/,
  );
  assert.match(
    notes,
    /:\s*reviewOsService\.listWrongAnswerItems\([\s\S]*?60/,
    "legacy /app/items must retain the generic full-record path",
  );

  const selectStart = repository.indexOf(
    "const LEARNING_NOTE_CANDIDATE_SELECT",
  );
  const selectEnd = repository.indexOf(
    "function containsAgendaSmokeSeedText",
    selectStart,
  );
  const selectBlock = repository.slice(selectStart, selectEnd);
  for (const field of [
    "id",
    "exam_name",
    "subject_label",
    "source_label",
    "problem_title",
    "problem_identifier",
    "raw_question_text",
    "raw_answer_text",
    "user_reason_preset",
    "created_at",
  ]) {
    assert.match(selectBlock, new RegExp(`"${field}"`));
  }
  for (const jsonPath of [
    "capture_note_engine_v2",
    "capture_note_engine_v1",
    "biggestGap",
    "comparisonPoint",
    "mistakeType",
    "nextAction",
    "nextTask",
    "topicCandidate",
    "topicTag",
  ]) {
    assert.match(selectBlock, new RegExp(jsonPath));
  }
  assert.doesNotMatch(
    selectBlock,
    /"user_id"|"correct_answer"|"user_answer"|"raw_payload"|"derived_payload"|"updated_at"/,
  );

  const repositoryStart = repository.indexOf(
    "async listLearningNoteCandidates(",
  );
  const repositoryEnd = repository.indexOf(
    "async listWrongAnswerItemsForAgenda(",
    repositoryStart,
  );
  const repositoryBlock = repository.slice(repositoryStart, repositoryEnd);
  assert.match(repositoryBlock, /\.select\(LEARNING_NOTE_CANDIDATE_SELECT\)/);
  assert.match(repositoryBlock, /\.eq\("user_id", userId\)/);
  assert.match(repositoryBlock, /\.eq\("exam_name", examName\)/);
  assert.match(repositoryBlock, /query = query\.gte\("created_at", cutoffIso\)/);
  assert.match(repositoryBlock, /query\.limit\(requestedLimit\)/);
  assert.doesNotMatch(repositoryBlock, /\.select\("\*"\)/);

  const serviceStart = service.indexOf("async listLearningNoteItems(");
  const serviceEnd = service.indexOf(
    "getWrongAnswerDetail(",
    serviceStart,
  );
  const serviceBlock = service.slice(serviceStart, serviceEnd);
  assert.match(serviceBlock, /const access = await this\.ensureAccess\(userId, email\)/);
  assert.match(serviceBlock, /getModeLabel\(mode\)/);
  assert.match(serviceBlock, /Math\.max\(requestedLimit \+ 20, requestedLimit\)/);
  assert.match(serviceBlock, /\.filter\(\(item\) => !isSmokeSeedItem\(item\)\)/);
  for (const field of [
    "id",
    "examName",
    "subjectLabel",
    "problemTitle",
    "problemIdentifier",
    "userReasonPreset",
    "derivedPayload",
    "createdAt",
  ]) {
    assert.match(serviceBlock, new RegExp(`${field}: item\\.${field}`));
  }
  assert.doesNotMatch(
    serviceBlock,
    /sourceLabel:|rawQuestionText:|rawAnswerText:/,
  );
});

test("FAST OWNER PREVIEW mounts folded timeline cards only after disclosure opens", () => {
  const disclosure = read("components/learner/v3-route-ui.tsx");
  const agendaClient = read(
    "components/review-os/learning-agenda-client.tsx",
  );

  assert.match(
    disclosure,
    /onToggle\?: ComponentPropsWithoutRef<"details">\["onToggle"\]/,
  );
  assert.match(disclosure, /onToggle=\{onToggle\}/);
  assert.match(agendaClient, /const \[historyOpen, setHistoryOpen\] = useState\(false\)/);
  assert.match(
    agendaClient,
    /onToggle=\{\(event\) => setHistoryOpen\(event\.currentTarget\.open\)\}/,
  );
  assert.match(
    agendaClient,
    /historyOpen \? \(\s*<TimelineList events=\{\[\.\.\.timeline\.history\]\.reverse\(\)\}/,
  );
  assert.match(
    agendaClient,
    /summary=\{`이전 회복 기록 · \$\{timeline\.history\.length\}개`\}/,
  );
});
