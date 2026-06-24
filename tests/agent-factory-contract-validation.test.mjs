import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function runScript(body) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-event-'));
  const eventPath = path.join(tempDir, 'event.json');
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body } }));
  const result = spawnSync(process.execPath, ['scripts/automation/validate-pr-contract.mjs'], {
    env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    encoding: 'utf8'
  });
  return result.status;
}

test('validate-pr-contract passes with complete body', () => {
  const body = `
## Goal

Test goal.

## Linked issue
Closes #123

## Non-goals

Test non goals.

## Risk classification
- Risk: [low]
- Reasons:
- Sensitive paths:

## Data boundary

Testing.

## Schema / API / environment changes

None.

## Tests and evidence

Tested.

## Runtime evidence

Not required.

## Rollout and rollback

N/A

## Remaining risks

None.

## Merge recommendation

- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
  assert.strictEqual(runScript(body), 0);
});

test('validate-pr-contract fails if missing sections', () => {
  const body = `
## Goal
Missing other sections.
`;
  assert.notStrictEqual(runScript(body), 0);
});
