#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function matchPattern(pattern, filePath) {
  const escaped = pattern
    .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\\*\\*/g, '.*')
    .replace(/\\*/g, '[^/]*');
  const regex = new RegExp('^' + escaped + '$');
  return regex.test(filePath);
}

function runtimeEvidenceRequired(files) {
  // Patterns requiring runtime evidence
  const patterns = [
    'supabase/**',
    '**/migrations/**',
    'auth/**',
    '**/auth/**',
    '**/RLS/**',
    '**/billing/**',
    '**/payments/**',
    '**/entitlement/**',
    '**/workflow-permission/**',
    '**/production-flags/**',
    '**/flags/**',
    '**/.env',
    '**/secrets/**'
  ];
  for (const file of files) {
    for (const p of patterns) {
      if (matchPattern(p, file)) {
        return true;
      }
    }
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  let riskFile = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--risk-file' && args[i + 1]) {
      riskFile = args[i + 1];
      i += 1;
    }
  }
  const filePath = riskFile || process.env.RISK_FILE || '.agent-factory/risk.json';
  let risk = 'low';
  let changedFiles = [];
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    risk = json.risk || 'low';
    changedFiles = json.changedFiles || [];
  } catch {
    // no file; assume low risk and no changed files
  }

  // Determine if runtime evidence required based on changed files
  const requiresEvidence = risk !== 'low' && runtimeEvidenceRequired(changedFiles);

  if (!requiresEvidence) {
    console.log(JSON.stringify({ result: 'not_required' }));
    return;
  }
  const hasEvidence = !!process.env.E2E_BASE_URL;
  if (!hasEvidence) {
    fail('Runtime evidence required but missing. Provide E2E_BASE_URL and other required environment variables.');
  }
  console.log(JSON.stringify({ result: 'required_and_present' }));
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
