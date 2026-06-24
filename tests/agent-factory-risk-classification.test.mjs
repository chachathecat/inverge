import assert from 'node:assert';
import { spawnSync } from 'node:child_process';

// These tests rely on the risk policy configured in config/agent-risk-policy.yml.

function runClassifier(changedFiles) {
  const env = { ...process.env, CHANGED_FILES: changedFiles };
  const result = spawnSync(process.execPath, ['scripts/automation/classify-risk.mjs'], { env, encoding: 'utf8' });
  return JSON.parse(result.stdout);
}

test('classify-risk high risk detection', () => {
  const data = runClassifier('.github/workflows/test.yml');
  assert.strictEqual(data.risk, 'high');
});

test('classify-risk medium risk detection', () => {
  const data = runClassifier('app/api/test.js');
  assert.strictEqual(data.risk, 'medium');
});

test('classify-risk low risk detection', () => {
  const data = runClassifier('docs/readme.md');
  assert.strictEqual(data.risk, 'low');
});
