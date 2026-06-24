#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { execSync } from 'node:child_process';
import path from 'node:path';

function parsePolicy(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const policy = {
    highRiskPaths: [],
    highRiskSignals: [],
    mediumRiskPaths: [],
    lowRiskPaths: [],
    autoMerge: {},
    blockingLabels: [],
  };
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^highRiskPaths:/i.test(trimmed)) {
      current = 'highRiskPaths';
      continue;
    }
    if (/^highRiskSignals:/i.test(trimmed)) {
      current = 'highRiskSignals';
      continue;
    }
    if (/^mediumRiskPaths:/i.test(trimmed)) {
      current = 'mediumRiskPaths';
      continue;
    }
    if (/^lowRiskPaths:/i.test(trimmed)) {
      current = 'lowRiskPaths';
      continue;
    }
    if (/^autoMerge:/i.test(trimmed)) {
      current = 'autoMerge';
      continue;
    }
    if (/^blockingLabels:/i.test(trimmed)) {
      current = 'blockingLabels';
      continue;
    }
    if (current && trimmed.startsWith('-')) {
      const value = trimmed.replace(/^-\\s*/, '').replace(/^["']|["']$/g, '');
      if (Array.isArray(policy[current])) {
        policy[current].push(value);
      }
      continue;
    }
  }
  return policy;
}

function matchPattern(pattern, filePath) {
  const escaped = pattern
    .replace(/[-\/\\^$+?.()|[\\]{}]/g, '\\$&')
    .replace(/\\\\\\*\\\\\\*/g, '.*')       // replace ** with .*
    .replace(/\\\\\\*/g, '[^/]*')           // replace * with anything but slash
    .replace(/\\\\\//g, '\\/');           // ensure slash is slash
  const regex = new RegExp('^' + escaped + '$');
  return regex.test(filePath);
}

function classify(files, policy) {
  let risk = 'low';
  const reasons = [];
  for (const file of files) {
    let matched = false;
    for (const pattern of policy.highRiskPaths) {
      if (matchPattern(pattern, file)) {
        risk = 'high';
        reasons.push(`File ${file} matches highRiskPath ${pattern}`);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    for (const pattern of policy.mediumRiskPaths) {
      if (matchPattern(pattern, file)) {
        if (risk !== 'high') risk = 'medium';
        reasons.push(`File ${file} matches mediumRiskPath ${pattern}`);
        matched = true;
        break;
      }
    }
  }
  return { risk, reasons };
}

function getChangedFiles() {
  const envChanged = process.env.CHANGED_FILES;
  if (envChanged) {
    return envChanged.split(/\r?\n/).filter((s) => s && s.trim() !== '');
  }
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let baseSha = null;
  let headSha = null;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      if (event.pull_request && event.pull_request.base && event.pull_request.head) {
        baseSha = event.pull_request.base.sha;
        headSha = event.pull_request.head.sha;
      }
    } catch {
      // ignore
    }
  }
  let diffOutput = '';
  try {
    if (baseSha && headSha) {
      diffOutput = execSync(`git diff --name-only ${baseSha} ${headSha}`, { encoding: 'utf8' });
    } else {
      diffOutput = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    }
  } catch (err) {
    console.error('[classify-risk] Failed to compute changed files', err);
  }
  return diffOutput.split(/\r?\n/).filter(Boolean);
}

function main() {
  const policyPath = path.resolve('config/agent-risk-policy.yml');
  const policy = parsePolicy(policyPath);
  const files = getChangedFiles();
  const { risk, reasons } = classify(files, policy);
  const result = { risk, reasons, changedFiles: files };
  const outputPath = process.env.RISK_OUTPUT_PATH;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  }
  if (process.env.GITHUB_OUTPUT) {
    const lines = [
      `risk=${risk}`,
      `changed_files_count=${files.length}`,
    ];
    fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (err) {
    console.error(err);
    process.exit(1);
}
