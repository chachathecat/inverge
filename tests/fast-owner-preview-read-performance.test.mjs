import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("FAST OWNER PREVIEW reuses session and access reads within one server request", () => {
  const session = read("lib/auth/session.ts");
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
