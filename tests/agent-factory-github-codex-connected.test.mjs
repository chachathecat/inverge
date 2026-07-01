import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const WORKFLOW_PATH = ".github/workflows/agent-factory-codex-connected.yml";
const DOC_PATH = "docs/agent-factory-github-codex-connected.md";
const PROMPT_PATH = ".github/codex/prompts/agent-factory-connected.md";

const read = (path) => fs.readFileSync(path, "utf8");

test("AF017 workflow is manually dispatched and owner gated", () => {
  const workflow = read(WORKFLOW_PATH);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /package_issue/);
  assert.match(workflow, /codex_review_pr/);
  assert.match(workflow, /approved_draft_pr/);
  assert.match(workflow, /target_issue/);
  assert.match(workflow, /target_roadmap_item/);
  assert.match(workflow, /pr_number/);
  assert.match(workflow, /chachathecat/);
  assert.match(workflow, /I approve AF017 Codex connected run/);
});

test("AF017 workflow connects to Codex in read-only mode", () => {
  const workflow = read(WORKFLOW_PATH);
  assert.match(workflow, /openai\/codex-action@v1/);
  assert.match(workflow, /prompt-file: \.github\/codex\/prompts\/agent-factory-connected\.md/);
  assert.match(workflow, /sandbox: read-only/);
  assert.match(workflow, /safety-strategy: drop-sudo/);
  assert.match(workflow, /persist-credentials: false/);
  const reviewJob = workflow.slice(workflow.indexOf("  codex_review_pr:"), workflow.indexOf("  af018_dry_run:"));
  assert.doesNotMatch(reviewJob, /contents:\s*write|pull-requests:\s*write/);
});

test("AF017 package mode keeps mutation disabled and uploads artifacts", () => {
  const workflow = read(WORKFLOW_PATH);
  assert.match(workflow, /npm run agent-factory:run/);
  assert.match(workflow, /--mode plan_only/);
  assert.match(workflow, /--allow-mutation "false"/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /codex-task-packages\.md/);
});

test("AF017 docs and prompt state report-only boundary", () => {
  const docs = read(DOC_PATH);
  const prompt = read(PROMPT_PATH);
  assert.match(docs, /read-only/);
  assert.match(docs, /AF017 review mode does not create branches, commits, pushes, PRs/);
  assert.match(docs, /never merged automatically|never merges a PR|never merged/i);
  assert.match(prompt, /read-only\/report-only/);
  assert.match(prompt, /Do not edit files/);
});
