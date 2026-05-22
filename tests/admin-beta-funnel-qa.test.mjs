import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin beta funnel page is access gated and internal only', async () => {
  const source = await readFile(new URL('../app/admin/beta-funnel/page.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('isAllowedAdminEmail'));
  assert.ok(source.includes('접근 권한이 없습니다.'));
  assert.ok(source.includes('getAdminBetaFunnel'));
});

test('beta funnel service includes required metrics and sanitized breakdown keys', async () => {
  const source = await readFile(new URL('../lib/review-os/service.ts', import.meta.url), 'utf8');
  ['capture_started','ocr_draft_generated','draft_confirmed','capture_saved','post_save_execution_started','post_save_execution_completed','review_followup_scheduled','home_view','today_task_started','today_task_completed','overdue_recovery_started','weekly_summary_view'].forEach((name) => assert.ok(source.includes(name)));
  ['mode','subject','sourceType','confidence','nextTaskType','hasReferenceSupport','hasOverdueQueue','dailyState'].forEach((key) => assert.ok(source.includes(key)));
});

test('cohort analytics use KST helper and avoid UTC slice extraction', async () => {
  const source = await readFile(new URL('../lib/review-os/service.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('const nowDay = getKstDayKey(new Date());'));
  assert.ok(source.includes('const day = getKstDayKey(new Date(event.createdAt));'));
  assert.equal(source.includes('const nowDay = new Date().toISOString().slice(0, 10);'), false);
  assert.equal(source.includes('const day = event.createdAt.slice(0, 10);'), false);
});

test('cohort conversion numerators are restricted to denominator intersections', async () => {
  const source = await readFile(new URL('../lib/review-os/service.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('const captureAndExecutionStartedUsers = captureUsers.filter((u) => u.counts.post_save_execution_started > 0);'));
  assert.ok(source.includes('const executionStartedAndCompletedUsers = executionStartedUsers.filter((u) => u.counts.post_save_execution_completed > 0);'));
  assert.ok(source.includes('const executionCompletedAndFollowupUsers = executionCompletedUsers.filter((u) => u.counts.review_followup_scheduled > 0);'));
  assert.ok(source.includes('const overdueShownAndCompletedUsers = overdueShownUsers.filter((u) => u.counts.overdue_recovery_completed > 0);'));
});

test('D1/D3/D7 retention are maturity-gated and nullable', async () => {
  const source = await readFile(new URL('../lib/review-os/service.ts', import.meta.url), 'utf8');
  const types = await readFile(new URL('../lib/review-os/types.ts', import.meta.url), 'utf8');
  const adminPage = await readFile(new URL('../app/admin/beta-funnel/page.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('const maturedForD1 = dayDiff(cohortDate, nowDay) >= 1;'));
  assert.ok(source.includes('const maturedForD3 = dayDiff(cohortDate, nowDay) >= 3;'));
  assert.ok(source.includes('const maturedForD7 = dayDiff(cohortDate, nowDay) >= 7;'));
  assert.ok(source.includes('d1ReturnRate: maturedForD1 ? pct(d1, total) : null,'));
  assert.ok(source.includes('d3ReturnRate: maturedForD3 ? pct(d3, total) : null,'));
  assert.ok(types.includes('d1ReturnRate: number | null;'));
  assert.ok(types.includes('d3ReturnRate: number | null;'));
  assert.ok(types.includes('d7ReturnRate: number | null;'));
  assert.ok(adminPage.includes('row.retention.d1ReturnRate===null?"-":`${row.retention.d1ReturnRate}%`'));
  assert.ok(adminPage.includes('row.retention.d3ReturnRate===null?"-":`${row.retention.d3ReturnRate}%`'));
  assert.ok(adminPage.includes('row.retention.d7ReturnRate===null?"-":`${row.retention.d7ReturnRate}%`'));
});

test('learner shell does not link beta funnel admin route', async () => {
  const shell = await readFile(new URL('../components/review-os/app-shell.tsx', import.meta.url), 'utf8');
  assert.equal(shell.includes('/admin/beta-funnel'), false);
});
