#!/usr/bin/env node

import { spawn } from 'node:child_process';

const mode = process.argv[2] ?? 'default';
const isCiMode = mode === 'ci';
const isLocalMode = mode === 'local';

const baseStages = [
  {
    name: 'capture-to-plan bridge test',
    command: 'node',
    args: ['--test', 'tests/capture-to-plan-bridge.test.mjs'],
  },
  {
    name: 'answer-review boundary test',
    command: 'node',
    args: ['--test', 'tests/answer-review-boundary.test.mjs'],
  },
  {
    name: 'capture telemetry sanitizer test',
    command: 'node',
    args: ['--test', 'tests/capture-telemetry-sanitizer.test.mjs'],
  },
  {
    name: 'learning-science minimal ux reset test',
    command: 'node',
    args: ['--test', 'tests/learning-science-minimal-ux-reset.test.mjs'],
  },
  {
    name: 'quality eval',
    command: 'npm',
    args: ['run', 'eval:quality'],
  },
  {
    name: 'taxonomy check',
    command: 'npm',
    args: ['run', 'check:taxonomy'],
  },
];

const e2eStage = {
  name: 'e2e smoke',
  command: 'npm',
  args: ['run', 'test:e2e:smoke'],
};

const buildStage = {
  name: 'build',
  command: 'npm',
  args: ['run', 'build'],
};

const stages = [...baseStages];

if (isCiMode) {
  stages.push(e2eStage);
} else if (!isLocalMode) {
  stages.push(e2eStage);
} else {
  console.log('ℹ️ Local learner loop check: skipping E2E smoke (CI-only path).');
}

stages.push(buildStage);

function runStage(stage) {
  return new Promise((resolve) => {
    const cmdText = `${stage.command} ${stage.args.join(' ')}`;
    console.log(`::group::Learner Loop Stage: ${stage.name}`);
    console.log(`▶ ${cmdText}`);

    const child = spawn(stage.command, stage.args, {
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

    child.on('close', (code, signal) => {
      if (signal) {
        console.log(`::endgroup::`);
        resolve({ ok: false, detail: `terminated by signal ${signal}` });
        return;
      }

      if (code === 0) {
        console.log(`✅ Stage passed: ${stage.name}`);
        console.log(`::endgroup::`);
        resolve({ ok: true });
        return;
      }

      console.log(`::endgroup::`);
      resolve({ ok: false, detail: `exited with code ${code}` });
    });

    child.on('error', (error) => {
      console.log(`::endgroup::`);
      resolve({ ok: false, detail: error.message });
    });
  });
}

for (const stage of stages) {
  const result = await runStage(stage);
  if (!result.ok) {
    console.error(`❌ Learner loop health failed at stage: ${stage.name} (${result.detail}).`);
    process.exit(1);
  }
}

console.log('✅ Learner loop health gate passed.');
