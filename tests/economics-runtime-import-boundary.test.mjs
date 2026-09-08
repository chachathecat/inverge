import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("trial candidate validation imports only pure modules, never a filesystem CLI", () => {
  const root = new URL("../lib/review-os/first-stage/runtime/", import.meta.url);
  const loader = readFileSync(new URL("owner-local-trial-content.ts", root), "utf8");
  assert.doesNotMatch(loader, /scripts\/content-review/u);
  assert.match(loader, /from "\.\/economics-review-candidate\.mjs"/u);
  const visited = new Set();
  function visit(url) {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = readFileSync(url, "utf8");
    assert.doesNotMatch(source, /\bprocess\b|node:(?:fs|path|url)|scripts\/content-review/u);
    for (const [, specifier] of source.matchAll(/(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/gu)) {
      if (specifier === "node:crypto") continue;
      assert.match(specifier, /^\.\/[^/]+\.mjs$/u);
      visit(new URL(specifier, url));
    }
  }
  visit(new URL("economics-review-candidate.mjs", root));
  assert.equal(visited.size, 2);
});

test("the runtime Git-marker probe rejects actual Git-contained private roots", async () => {
  const source = readFileSync(new URL("../lib/review-os/first-stage/runtime/owner-local-trial-server.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "privateRoot");
  assert.ok(fn);
  const compiled = ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified, fn, ast),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let probes = 0;
  const check = runInNewContext(compiled + ";privateRoot", { path, realpath, access: async target => { probes++; return access(target); } });
  const root = await mkdtemp(path.join(tmpdir(), "inverge-private-root-test-"));
  try {
    await mkdir(path.join(root, "private"));
    assert.equal(await check(path.join(root, "private")), await realpath(path.join(root, "private")));
    assert.ok(probes > 0);
    await writeFile(path.join(root, ".git"), "SYNTHETIC_GIT_MARKER");
    await assert.rejects(check(path.join(root, "private")), /local_trial_unavailable/u);
    await assert.rejects(check("relative-root"), /local_trial_unavailable/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
