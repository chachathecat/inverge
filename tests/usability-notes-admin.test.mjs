import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('usability doc exists with five required tasks and rubric criteria', async () => {
  const doc = await readFile(new URL('../docs/usability/korean-learner-test-script.md', import.meta.url), 'utf8');
  ['첫 온보딩','오답 캡처','2차 모드','OCR 실패','오늘 할 일 완료'].forEach((keyword) => assert.ok(doc.includes(keyword)));
  ['clarity','friction','cognitive load','trust','study value','aesthetics'].forEach((keyword) => assert.ok(doc.includes(keyword)));
});

test('admin usability notes route and API are access gated', async () => {
  const page = await readFile(new URL('../app/admin/usability-notes/page.tsx', import.meta.url), 'utf8');
  const api = await readFile(new URL('../app/api/admin/usability-notes/route.ts', import.meta.url), 'utf8');
  assert.ok(page.includes('isAllowedAdminEmail'));
  assert.ok(page.includes('접근 권한이 없습니다.'));
  assert.ok(api.includes('requireAdminRouteSession'));
});

test('learner shell does not link admin usability notes route', async () => {
  const shell = await readFile(new URL('../components/review-os/app-shell.tsx', import.meta.url), 'utf8');
  assert.equal(shell.includes('/admin/usability-notes'), false);
});

test('usability notes schema has no raw OCR/problem/answer fields', async () => {
  const repo = await readFile(new URL('../lib/inverge/admin-usability-notes-repository.ts', import.meta.url), 'utf8');
  ['raw_ocr','rawOcr','rawAnswer','rawProblem','problemText','answerText'].forEach((forbidden) => {
    assert.equal(repo.includes(forbidden), false);
  });
  ['route','task','frictionPoint','severity','quote','suggestedFix'].forEach((required) => {
    assert.ok(repo.includes(required));
  });
});
