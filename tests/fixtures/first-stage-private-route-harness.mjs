import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import * as application from "../../lib/review-os/first-stage/runtime/session-application.ts";
import { loadEconomicsContent } from "../../lib/review-os/first-stage/runtime/economics-content.ts";
import { syntheticContentInput } from "./first-stage-economics-content-harness.mjs";
import { loadAccountingContent } from "../../lib/review-os/first-stage/runtime/accounting-content.ts";
import { syntheticAccountingInput } from "./first-stage-accounting-content-harness.mjs";

export const ENVIRONMENT = { NODE_ENV: "test", VERCEL_ENV: "development",
  INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "true", ALPHA_ADMIN_EMAILS: "owner@example.test",
  INVERGE_OWNER_FIRST_STAGE_EMAILS: "owner@example.test" };

/** Execute unchanged source files; substitute only declared boundary imports.
 * No environment mutation, test-only route, raw stock or external auth/database.
 */
export function compilePrivateSource(relative, dependencies, environment = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,process){${compiled}\n})`)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `undeclared test dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports, { env: environment, cwd: () => process.cwd() });
  return loaded.exports;
}

export function privateRoute(harness, options = {}) {
  const counts = { auth: 0, catalog: 0, repository: 0 };
  const ownerId = options.ownerId ?? "synthetic-owner-a";
  const server = compilePrivateSource("lib/review-os/first-stage/runtime/session-server.ts", {
    "server-only": {},
    "@/lib/auth/session": { getServerSessionUser: async () => {
      counts.auth++;
      return options.session ?? { isAuthenticated: true, userId: ownerId, email: "owner@example.test" };
    } },
    "@/lib/supabase/persistence": { getSupabasePersistenceClient: () => {
      counts.repository++; return options.client ?? {};
    } },
    "./approved-catalog": { loadApprovedPrivateFirstStageCatalog: async () => {
      counts.catalog++;
      return options.noCatalog ? null : loadEconomicsContent(options.contentInput ?? syntheticContentInput());
    }, loadApprovedPrivateAccountingCatalog: async () => {
      counts.catalog++;
      return options.noCatalog ? null : loadAccountingContent(options.contentInput ?? syntheticAccountingInput());
    } },
    "./session-application": { ...application, createPrivateSessionApplication: dependencies =>
      application.createPrivateSessionApplication({ ...dependencies, now: harness.getClock }) },
    "./session-repository": { createPrivateSessionRepository: options.repository ?? (() => harness.store) },
  }, options.environment ?? ENVIRONMENT);
  const route = compilePrivateSource(options.subject === "accounting"
    ? "app/api/review-os/first-stage/accounting/sessions/route.ts"
    : "app/api/review-os/first-stage/sessions/route.ts", {
    "@/lib/review-os/first-stage/runtime/session-server": server,
  });
  return { ...route, counts, server };
}
