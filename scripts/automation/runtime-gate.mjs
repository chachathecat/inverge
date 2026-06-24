#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';

function fail(msg) {
  console.error(msg);
  process.exit(1);
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
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    risk = json.risk || 'low';
  } catch {
    // missing risk file, assume low
  }

  const runtimeRequired = risk !== 'low';
  if (!runtimeRequired) {
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
