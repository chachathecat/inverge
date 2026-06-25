import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesGlob } from "../scripts/automation/glob-match.mjs";

test("double-star matches nested paths", () => {
  assert.equal(matchesGlob(".github/workflows/**", ".github/workflows/ci-fast.yml"), true);
  assert.equal(matchesGlob("app/api/**", "app/api/learner/route.ts"), true);
});

test("leading double-star also matches top-level files", () => {
  assert.equal(matchesGlob("**/*.md", "README.md"), true);
  assert.equal(matchesGlob("**/*.md", "docs/README.md"), true);
});

test("single star does not cross path separators", () => {
  assert.equal(matchesGlob("next.config.*", "next.config.ts"), true);
  assert.equal(matchesGlob("next.config.*", "config/next.config.ts"), false);
});
