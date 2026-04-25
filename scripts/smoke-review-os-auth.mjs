const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

const K = {
  firstExam: "\uac10\uc815\ud3c9\uac00\uc0ac 1\ucc28",
  secondExam: "\uac10\uc815\ud3c9\uac00\uc0ac 2\ucc28",
  civilLaw: "\ubbfc\ubc95",
  practice: "\uac10\uc815\ud3c9\uac00\uc2e4\ubb34",
  conditionMissing: "\uc870\uac74 \ub204\ub77d",
  issueApplicationWeak: "\ud310\ub840/\ub17c\uc810 \uc801\uc6a9 \ubd80\uc871",
  firstNote: "\uc624\ub2f5\ub178\ud2b8",
  secondNote: "\uad50\uc815\ub178\ud2b8",
  login: "\ub85c\uadf8\uc778",
  firstStart: "\uac10\uc815\ud3c9\uac00\uc0ac 1\ucc28 \uc2dc\uc791",
  secondStart: "\uac10\uc815\ud3c9\uac00\uc0ac 2\ucc28 \uc2dc\uc791",
  todayEntry: "\uc624\ub298\uc758 \uc6b4\uc601 \ud654\uba74\uc73c\ub85c",
  secondTheory: "\uac10\uc815\ud3c9\uac00\uc774\ub860",
  secondLaw: "\uac10\uc815\ud3c9\uac00 \ubc0f \ubcf4\uc0c1\ubc95\uaddc",
};

let cookie = "";

function mergeCookie(headers) {
  const setCookie = headers.getSetCookie?.() ?? [];
  const fallback = headers.get("set-cookie");
  const values = setCookie.length > 0 ? setCookie : fallback ? [fallback] : [];
  if (values.length === 0) return;

  const next = values.map((value) => value.split(";")[0]).join("; ");
  cookie = cookie ? `${cookie}; ${next}` : next;
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    redirect: "manual",
  });

  mergeCookie(response.headers);

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authenticate(mode) {
  const { response, body } = await request(`/api/dev/smoke-auth?mode=${mode}`, { method: "POST" });
  assert(response.status === 200, `smoke auth failed for ${mode}: ${response.status} ${JSON.stringify(body)}`);
  assert(String(cookie).includes("__inverge_dev_smoke_auth="), "smoke auth cookie was not set");
  return body;
}

async function assertPublicEntry() {
  const root = await request("/");
  assert(root.response.status === 200, `/ expected 200, got ${root.response.status}`);
  assert(root.text.includes(K.firstStart), "/ did not render first-mode public entry");
  assert(root.text.includes(K.secondStart), "/ did not render second-mode public entry");
  assert(root.text.includes(K.todayEntry), "/ did not render returning-user entry");
  assert(root.text.includes('href="/app?mode=first"'), "/ first-mode entry did not preserve mode in href");
  assert(root.text.includes('href="/app?mode=second"'), "/ second-mode entry did not preserve mode in href");

  for (const mode of ["first", "second"]) {
    const redirected = await request(`/app?mode=${mode}`);
    assert(redirected.response.status === 307, `/app?mode=${mode} should redirect unauthenticated users`);
    const location = redirected.response.headers.get("location") ?? "";
    assert(
      location === `/login?returnTo=%2Fapp%3Fmode%3D${mode}`,
      `/app?mode=${mode} redirected to unexpected location: ${location}`,
    );
  }
}

async function assertAuthenticatedLoginReturnTo() {
  for (const mode of ["first", "second"]) {
    const redirected = await request(`/login?returnTo=%2Fapp%3Fmode%3D${mode}`);
    assert(redirected.response.status === 307, `/login authenticated redirect expected 307 for ${mode}`);
    const location = redirected.response.headers.get("location") ?? "";
    assert(location === `/app?mode=${mode}`, `/login lost ${mode} returnTo, got ${location}`);
  }
}

function assertAuthenticatedSurface(path, text) {
  assert(!text.includes(K.firstStart), `${path} leaked public first-mode entry copy`);
  assert(!text.includes(K.secondStart), `${path} leaked public second-mode entry copy`);
  assert(!text.includes(`>${K.login}<`), `${path} leaked login CTA`);
  assert(!text.includes('href="/login"'), `${path} leaked login link`);
}

async function smokeMode(mode, payload, expectedNoteKind) {
  await authenticate(mode);

  for (const path of [`/app?mode=${mode}`, `/app/capture?mode=${mode}`]) {
    const { response, text } = await request(path);
    assert(response.status === 200, `${path} expected 200, got ${response.status}`);
    assertAuthenticatedSurface(path, text);
  }

  const create = await request("/api/os/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert(create.response.status === 200, `create item failed: ${create.response.status} ${JSON.stringify(create.body)}`);

  const itemId = create.body?.item?.id;
  assert(itemId, "create item did not return item id");

  const detailPath = `/app/items/${itemId}?mode=${mode}`;
  const detail = await request(detailPath);
  assert(detail.response.status === 200, `detail failed: ${detail.response.status}`);
  assert(detail.text.includes(expectedNoteKind), `${detailPath} did not render expected note kind`);
  assertAuthenticatedSurface(detailPath, detail.text);

  return itemId;
}

async function saveProfile(mode, subjectLabel) {
  const response = await request("/api/os/profile", {
    method: "POST",
    body: JSON.stringify({
      examName: mode === "second" ? K.secondExam : K.firstExam,
      examDate: null,
      preferredSubjects: [subjectLabel],
    }),
  });
  assert(response.response.status === 200, `settings save failed for ${mode}: ${response.response.status}`);
  assert(response.body?.profile?.examName === (mode === "second" ? K.secondExam : K.firstExam), `settings saved wrong mode for ${mode}`);

  const settings = await request(`/app/settings?mode=${mode}`);
  assert(settings.response.status === 200, `/app/settings?mode=${mode} expected 200`);
  assert(settings.text.includes(mode === "second" ? "\uac10\ud3c9 2\ucc28" : "\uac10\ud3c9 1\ucc28"), `settings did not render ${mode} shell state`);
}

async function assertInvalidSubjectNormalization() {
  const invalidSecond = await request("/api/os/items", {
    method: "POST",
    body: JSON.stringify({
      examName: K.secondExam,
      subjectLabel: K.civilLaw,
      sourceType: "manual",
      problemTitle: "Smoke invalid second subject",
      rawQuestionText: "wrong second subject payload",
      correctAnswer: "reference",
      userAnswer: "answer",
      userReasonText: "missing issue",
      userReasonPreset: K.issueApplicationWeak,
      confidence: "\uc911\uac04",
    }),
  });
  assert(invalidSecond.response.status === 200, "invalid second subject create failed");
  assert(invalidSecond.body?.item?.subjectLabel === K.practice, `second mode accepted invalid subject: ${invalidSecond.body?.item?.subjectLabel}`);

  const invalidFirst = await request("/api/os/items", {
    method: "POST",
    body: JSON.stringify({
      examName: K.firstExam,
      subjectLabel: K.practice,
      sourceType: "manual",
      problemTitle: "Smoke invalid first subject",
      rawQuestionText: "wrong first subject payload",
      correctAnswer: "3",
      userAnswer: "2",
      userReasonText: K.conditionMissing,
      userReasonPreset: K.conditionMissing,
      confidence: "\uc911\uac04",
    }),
  });
  assert(invalidFirst.response.status === 200, "invalid first subject create failed");
  assert(invalidFirst.body?.item?.subjectLabel === K.civilLaw, `first mode accepted invalid subject: ${invalidFirst.body?.item?.subjectLabel}`);
}

async function assertDetailIsolation(firstId, secondId) {
  const firstAsSecond = await request(`/app/items/${firstId}?mode=second`);
  assert(firstAsSecond.response.status === 200, "first artifact detail failed in second shell mode");
  assert(firstAsSecond.text.includes("\uac10\ud3c9 1\ucc28"), "first artifact mutated away from first-mode detail");
  assert(firstAsSecond.text.includes(K.firstNote), "first artifact did not render wrong-answer note");

  const secondAsFirst = await request(`/app/items/${secondId}?mode=first`);
  assert(secondAsFirst.response.status === 200, "second artifact detail failed in first shell mode");
  assert(secondAsFirst.text.includes("\uac10\ud3c9 2\ucc28"), "second artifact mutated away from second-mode detail");
  assert(secondAsFirst.text.includes(K.secondNote), "second artifact did not render correction note");
}

async function main() {
  await assertPublicEntry();

  const firstId = await smokeMode(
    "first",
    {
      examName: K.firstExam,
      subjectLabel: K.civilLaw,
      sourceType: "manual",
      problemTitle: `Smoke first ${Date.now()}`,
      rawQuestionText: "\uc815\ub2f5: 3 / \ub0b4 \ub2f5: 2 / \uc870\uac74 \ub204\ub77d",
      correctAnswer: "3",
      userAnswer: "2",
      userReasonText: K.conditionMissing,
      userReasonPreset: K.conditionMissing,
      confidence: "\uc911\uac04",
      keyConcepts: ["\uc694\uac74", "\ud6a8\uacfc", "\uc608\uc678"],
      coreFormula: "\uc694\uac74 -> \ud6a8\uacfc -> \uc608\uc678",
    },
    K.firstNote,
  );

  const secondId = await smokeMode(
    "second",
    {
      examName: K.secondExam,
      subjectLabel: K.practice,
      sourceType: "manual",
      problemTitle: `Smoke second ${Date.now()}`,
      rawQuestionText: "\uc0ac\ub840\uc640 \uae30\uc900 \ub2f5\uc548 \ube44\uad50",
      correctAnswer: "\uae30\uc900 \ub2f5\uc548 \uad6c\uc870",
      userAnswer: "\ub0b4 \ub2f5\uc548",
      userReasonText: "\uacc4\uc0b0 \uadfc\uac70 \ub204\ub77d",
      userReasonPreset: K.issueApplicationWeak,
      confidence: "\uc911\uac04",
      missingIssue: "\uacc4\uc0b0 \uadfc\uac70 \ub204\ub77d",
      weakStructurePoint: "\ubb38\uc81c \uc694\uad6c -> \ud3c9\uac00 \uadfc\uac70 -> \uacc4\uc0b0 -> \uacb0\ub860",
      weakApplicationSentence: "\ud3c9\uac00 \uc808\ucc28\uc640 \uacc4\uc0b0 \uadfc\uac70\ub97c \ubd84\ub9ac\ud574 \uc801\uc2b5\ub2c8\ub2e4.",
      rewriteInstruction: "\ube60\uc9c4 \ud3c9\uac00 \uadfc\uac70 1\uac1c\ub97c \uba3c\uc800 \ubcf4\uac15\ud569\ub2c8\ub2e4.",
    },
    K.secondNote,
  );

  await assertAuthenticatedLoginReturnTo();
  await saveProfile("first", K.civilLaw);
  await saveProfile("second", K.practice);
  await assertInvalidSubjectNormalization();
  await assertDetailIsolation(firstId, secondId);

  console.log(JSON.stringify({ ok: true, baseUrl, firstId, secondId }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
