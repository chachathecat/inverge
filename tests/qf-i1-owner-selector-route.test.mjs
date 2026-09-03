import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as qfI1 from "../lib/question-foundry/runtime/qf-i1-bank-first.ts";

const route = readFileSync(
  new URL("../app/api/core-blitz/qf-i1/select/route.ts", import.meta.url),
  "utf8",
);

test("QF-I1 selector module has one callable bank-first authority and the route resolves it explicitly", () => {
  const callable = Object.entries(qfI1).filter(
    ([name, value]) =>
      typeof value === "function" &&
      /(?:qf.*i1|bank.*first|first.*bank)/iu.test(name),
  );
  assert.ok(callable.length >= 1, "missing QF-I1 bank-first selector export");
  const explicit = callable.filter(([name]) => route.includes(`\"${name}\"`));
  assert.ok(
    explicit.length >= 1 || callable.length === 1,
    `route cannot resolve exports: ${callable.map(([name]) => name).join(", ")}`,
  );
});

test("owner selector endpoint is fail-closed and cannot activate persistence or providers", () => {
  for (const token of [
    "requireTrustedRepairAccess",
    "MAX_REQUEST_BYTES",
    "QF_I1_REQUEST_TOO_LARGE",
    "QF_I1_INVALID_INPUT",
    "QF_I1_OWNER_AUTHORITY_REQUIRED",
    "Cache-Control",
    "no-store",
    "persisted: false",
    "providerExecution: false",
    "productionActivation: false",
    "remoteMutation: false",
  ]) {
    assert.ok(route.includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(route, /createSupabase|from\(|\.insert\(|\.update\(|\.upsert\(|fetch\(/u);
});

test("endpoint never accepts an unbounded or array request body", () => {
  assert.match(route, /length > MAX_REQUEST_BYTES/u);
  assert.match(route, /!input \|\| typeof input !== \"object\" \|\| Array\.isArray\(input\)/u);
});
