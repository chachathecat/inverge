#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function getEventBody() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      const pr = event.pull_request;
      if (pr && typeof pr.body === 'string') {
        return pr.body;
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function main() {
  const body = getEventBody() ?? process.env.PR_BODY ?? '';
  if (!body || body.trim() === '') {
    fail('PR body is missing');
  }

  const issueRefs = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)/gi)];
  if (issueRefs.length !== 1) {
    fail('PR must reference exactly one issue using "Closes #<issue>" or "Fixes #<issue>".');
  }

  const requiredHeadings = [
    '## Goal',
    '## Non-goals',
    '## Risk classification',
    '## Data boundary',
    '## Schema / API / environment changes',
    '## Tests and evidence',
    '## Runtime evidence',
    '## Rollout and rollback',
    '## Remaining risks',
    '## Merge recommendation',
  ];

  const missing = [];
  for (const heading of requiredHeadings) {
    const regex = new RegExp(`^\\s*${heading}\\b`, 'im');
    if (!regex.test(body)) {
      missing.push(heading);
    }
  }

  if (missing.length > 0) {
    fail('Missing required sections: ' + missing.join(', '));
  }

  const riskMatch = body.match(/Risk:\\s*\\[\\s*(low|medium|high)\\s*\\]/i);
  if (!riskMatch) {
    fail('Risk classification section must include a risk level [low|medium|high].');
  }

  const mergeMatch = body.match(/- \\[([ xX])\\] Auto-merge candidate/);
  const humanMatch = body.match(/- \\[([ xX])\\] Human approval required/);
  const blockedMatch = body.match(/- \\[([ xX])\\] Blocked/);
  if (!mergeMatch && !humanMatch && !blockedMatch) {
    fail('Merge recommendation section must contain one of the checklist items.');
  }

  console.log('validate-pr-contract: pass');
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
