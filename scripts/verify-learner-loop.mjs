import { spawnSync } from 'node:child_process';

const NODE_TEST_ARGS = ['--experimental-strip-types', '--loader', './tests/ts-extension-loader.mjs', '--test'];

const stages = [
  {
    name: 'Capture → Plan bridge',
    command: 'node',
    args: [...NODE_TEST_ARGS, 'tests/capture-to-plan-bridge.test.mjs'],
  },
  {
    name: 'Answer review boundary',
    command: 'node',
    args: [...NODE_TEST_ARGS, 'tests/answer-review-boundary.test.mjs'],
  },
  {
    name: 'Capture telemetry sanitizer',
    command: 'node',
    args: [...NODE_TEST_ARGS, 'tests/capture-telemetry-sanitizer.test.mjs'],
  },
  {
    name: 'Learning science minimal UX reset',
    command: 'node',
    args: [...NODE_TEST_ARGS, 'tests/learning-science-minimal-ux-reset.test.mjs'],
  },
  {
    name: 'Quality eval',
    command: 'npm',
    args: ['run', 'eval:quality'],
  },
  {
    name: 'Taxonomy check',
    command: 'npm',
    args: ['run', 'check:taxonomy'],
  },
  {
    name: 'E2E smoke',
    command: 'npm',
    args: ['run', 'test:e2e:smoke'],
  },
  {
    name: 'Build',
    command: 'npm',
    args: ['run', 'build'],
  },
];

for (const stage of stages) {
  console.log(`\n▶ ${stage.name}`);
  const result = spawnSync(stage.command, stage.args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`\n✖ Failed stage: ${stage.name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n✓ Learner loop health gate passed');
