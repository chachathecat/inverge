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

test('learner shell does not link beta funnel admin route', async () => {
  const shell = await readFile(new URL('../components/review-os/app-shell.tsx', import.meta.url), 'utf8');
  assert.equal(shell.includes('/admin/beta-funnel'), false);
});
