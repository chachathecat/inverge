import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MigrationDependencyClosureError,
  deriveExternalFunctionDependencies,
  deriveIndexTargetOccurrences,
  deriveMigrationDependencyClosure,
  deriveRequiredExtensionUses,
  deriveSqlIdentifierOccurrences,
  loadLiveMigrationSql,
  tokenizePostgresSql,
  validateMigrationDependencyClosure,
} from "../scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const contractPath = path.join(
  repositoryRoot,
  "config",
  "dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
);
const analyzerPath = path.join(
  repositoryRoot,
  "scripts",
  "automation",
  "wcv-c3r-a0-migration-dependency-closure.mjs",
);
const prContractValidatorPath = path.join(
  repositoryRoot,
  "scripts",
  "automation",
  "validate-pr-contract.mjs",
);
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const manifest = contract.migrationHistoryCompatibilityManifestV1;
const agentsSource = await readFile(path.join(repositoryRoot, "AGENTS.md"), "utf8");
const runnerSource = await readFile(
  path.join(repositoryRoot, "scripts", "run-node-tests.mjs"),
  "utf8",
);
const liveSql = await loadLiveMigrationSql(
  path.join(repositoryRoot, "supabase", "migrations"),
);

function clone(value) {
  return structuredClone(value);
}

function expectClosureCode(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof MigrationDependencyClosureError);
    assert.equal(error.code, code);
    return true;
  });
}

function deriveSynthetic(sql, externalDatabaseObjects = []) {
  return deriveMigrationDependencyClosure(
    [
      {
        currentFilename: "synthetic.sql",
        presentOnLiveMain: true,
        freshHistoryOrder: 1,
      },
    ],
    new Map([["synthetic.sql", sql]]),
    {
      externalDatabaseObjects,
      closedQualifiedDatabaseSchemas: [
        "auth",
        "extensions",
        "pg_catalog",
        "public",
        "storage",
      ],
    },
  )[0];
}

function occurrenceByRole(sql, role) {
  return deriveSqlIdentifierOccurrences(sql).filter(
    (occurrence) => occurrence.role === role,
  );
}

function completePrBody(linkLines) {
  return `## Goal

C3R-A0 source authority.

${linkLines}

## Non-goals

No runtime.

## Risk classification

- Risk: [high]

## Data boundary

Metadata only.

## Schema / API / environment changes

None.

## Tests and evidence

Focused and full validation.

## Runtime evidence

Not applicable to source authority.

## Rollout and rollback

Revert the source-only squash.

## Remaining risks

Successor work remains unstarted.

## Merge recommendation

- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

async function runPrContract(body, pullRequestOverrides = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "inverge-a0-contract-"));
  const eventPath = path.join(directory, "event.json");
  const exactPullRequest = {
    body,
    title: "[WCV-C3R-A0] Install PostgreSQL migration dependency authority",
    base: {
      ref: "main",
      sha: "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
    },
    head: {
      ref: "codex/wcv-c3r-a0-migration-dependency-authority",
      repo: { full_name: "chachathecat/inverge" },
    },
    ...pullRequestOverrides,
  };
  await writeFile(
    eventPath,
    JSON.stringify({
      repository: { full_name: "chachathecat/inverge" },
      pull_request: exactPullRequest,
    }),
    "utf8",
  );
  try {
    return spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("live C3R-A0 manifest validates all 25 migration filenames and SQL closure", () => {
  const summary = validateMigrationDependencyClosure(manifest, liveSql);
  assert.deepEqual(summary, {
    manifestVersion: "MigrationDependencyClosureV1",
    liveMigrationCount: 25,
    executableCreateExtensionStatementCount: 6,
    createdExtensionNames: ["pgcrypto", "vector"],
    sqlDerivedExternalFunctionCount: 28,
  });
});

test("DROP INDEX exclusion retains a later same-named function dependency", () => {
  const sql = "DROP INDEX public.same_name; SELECT public.same_name();";
  const result = deriveSynthetic(sql, [
    { kind: "function", identifier: "public.same_name" },
  ]);
  assert.deepEqual(result.referencedDatabaseObjects, [
    { kind: "function", identifier: "public.same_name" },
  ]);
  assert.deepEqual(
    result.identifierOccurrences.map(({ role, objectKind }) => ({
      role,
      objectKind,
    })),
    [
      { role: "index_target", objectKind: "index" },
      { role: "function_call", objectKind: "function" },
    ],
  );
});

test("quoted index and function identities retain distinct exact occurrences", () => {
  const sql =
    'DROP INDEX "Public"."Same.Name"; SELECT "Public"."Same.Name"();';
  const result = deriveSynthetic(sql, [
    { kind: "function", identifier: '"Public"."Same.Name"' },
  ]);
  assert.deepEqual(result.referencedDatabaseObjects, [
    { kind: "function", identifier: '"Public"."Same.Name"' },
  ]);
  assert.equal(result.identifierOccurrences[0].normalizedComponents[1].value, "Same.Name");
  assert.equal(result.identifierOccurrences[1].role, "function_call");
});

test("index targets exclude only their exact source spans", () => {
  const sql = "DROP INDEX public.same_name; SELECT public.same_name();";
  const [target] = deriveIndexTargetOccurrences(sql);
  const [call] = occurrenceByRole(sql, "function_call");
  assert.deepEqual(
    [target.statementOrdinal, target.tokenStart, target.tokenEnd],
    [1, 11, 27],
  );
  assert.notEqual(target.statementOrdinal, call.statementOrdinal);
  assert.notEqual(target.tokenStart, call.tokenStart);
});

test("same-name relation and function occurrences in one CREATE INDEX statement remain visible", () => {
  const sql =
    "CREATE INDEX same_name ON public.same_name ((public.same_name()));";
  const result = deriveSynthetic(sql, [
    { kind: "table", identifier: "public.same_name" },
    { kind: "function", identifier: "public.same_name" },
  ]);
  assert.deepEqual(result.referencedDatabaseObjects, [
    { kind: "function", identifier: "public.same_name" },
    { kind: "table", identifier: "public.same_name" },
  ]);
  assert.deepEqual(
    result.identifierOccurrences.map((occurrence) => occurrence.role),
    ["index_target", "relation_reference", "function_call"],
  );
});

test("same-name occurrence in another statement remains visible", () => {
  const sql = "DROP INDEX public.same_name; SELECT * FROM public.same_name;";
  const result = deriveSynthetic(sql, [
    { kind: "table", identifier: "public.same_name" },
  ]);
  assert.deepEqual(result.referencedDatabaseObjects, [
    { kind: "table", identifier: "public.same_name" },
  ]);
  assert.equal(occurrenceByRole(sql, "relation_reference").length, 1);
});

test("multiple DROP INDEX targets exclude only their own occurrences", () => {
  const sql =
    "DROP INDEX public.same_name, public.other_name; " +
    "SELECT public.same_name(), public.other_name();";
  const result = deriveSynthetic(sql, [
    { kind: "function", identifier: "public.same_name" },
    { kind: "function", identifier: "public.other_name" },
  ]);
  assert.equal(deriveIndexTargetOccurrences(sql).length, 2);
  assert.equal(occurrenceByRole(sql, "function_call").length, 2);
  assert.deepEqual(result.referencedDatabaseObjects, [
    { kind: "function", identifier: "public.other_name" },
    { kind: "function", identifier: "public.same_name" },
  ]);
});

test("index-target and function-call statement order does not change closure", () => {
  const external = [{ kind: "function", identifier: "public.same_name" }];
  const before = deriveSynthetic(
    "SELECT public.same_name(); DROP INDEX public.same_name;",
    external,
  );
  const after = deriveSynthetic(
    "DROP INDEX public.same_name; SELECT public.same_name();",
    external,
  );
  assert.deepEqual(before.referencedDatabaseObjects, after.referencedDatabaseObjects);
});

test("unquoted PostgreSQL identifiers fold ASCII case to lowercase", () => {
  const [occurrence] = deriveSqlIdentifierOccurrences(
    "SELECT PUBLIC.PROFILES();",
  );
  assert.deepEqual(occurrence.normalizedComponents, [
    { value: "public", quoted: false },
    { value: "profiles", quoted: false },
  ]);
});

test("quoted PostgreSQL identifier case remains exact", () => {
  const [occurrence] = deriveSqlIdentifierOccurrences(
    'SELECT "Public"."Profiles"();',
  );
  assert.deepEqual(occurrence.normalizedComponents, [
    { value: "Public", quoted: true },
    { value: "Profiles", quoted: true },
  ]);
});

test("dots inside quoted identifier components remain atomic", () => {
  const [occurrence] = deriveSqlIdentifierOccurrences(
    'SELECT "tenant.v1"."items.current"();',
  );
  assert.deepEqual(occurrence.normalizedComponents, [
    { value: "tenant.v1", quoted: true },
    { value: "items.current", quoted: true },
  ]);
});

test("doubled quotes decode without changing quoted identity", () => {
  const [occurrence] = deriveSqlIdentifierOccurrences(
    'SELECT "tenant""v1"."items""current"();',
  );
  assert.deepEqual(occurrence.normalizedComponents, [
    { value: 'tenant"v1', quoted: true },
    { value: 'items"current', quoted: true },
  ]);
});

test("comments and strings create no false dependency occurrences", () => {
  const sql = [
    "-- DROP INDEX public.fake;",
    "/* SELECT public.fake(); */",
    "SELECT 'public.fake()', E'public.other()';",
  ].join("\n");
  assert.deepEqual(deriveSqlIdentifierOccurrences(sql), []);
});

test("unsupported identifier syntax fails closed with a typed diagnostic", () => {
  expectClosureCode(
    () => tokenizePostgresSql('SELECT U&"d\\0061t";'),
    "UNSUPPORTED_IDENTIFIER_FORM",
  );
});

test("unqualified digest maps to pgcrypto without double-counting qualified digest", () => {
  const uses = deriveRequiredExtensionUses(
    "SELECT digest(payload, 'sha256'), extensions.digest(payload, 'sha256');",
  );
  assert.deepEqual(uses, [
    {
      name: "pgcrypto",
      schema: null,
      evidence: [
        { kind: "function", identifier: "digest", occurrences: 1 },
      ],
    },
    {
      name: "pgcrypto",
      schema: "extensions",
      evidence: [
        {
          kind: "function",
          identifier: "extensions.digest",
          occurrences: 1,
        },
      ],
    },
  ]);
});

test("live extension derivation is exactly pgcrypto and vector", () => {
  const summary = validateMigrationDependencyClosure(manifest, liveSql);
  assert.deepEqual(summary.createdExtensionNames, ["pgcrypto", "vector"]);
  assert.equal(summary.executableCreateExtensionStatementCount, 6);
  assert.equal(
    JSON.stringify(manifest).includes('"pgvector"'),
    true,
    "pgvector appears only as a prohibited alias in the closed registry",
  );
  assert.equal(
    manifest.migrationDependencyClosureV1.canonicalExtensionNames.includes(
      "pgvector",
    ),
    false,
  );
});

test("extension and explicit schema tokens have closed occurrence roles", () => {
  assert.deepEqual(
    deriveSqlIdentifierOccurrences(
      "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;",
    ).map(({ role, objectKind, normalizedComponents }) => ({
      role,
      objectKind,
      normalizedComponents,
    })),
    [
      {
        role: "extension_name",
        objectKind: "extension",
        normalizedComponents: [{ value: "pgcrypto", quoted: false }],
      },
      {
        role: "schema_reference",
        objectKind: "schema",
        normalizedComponents: [{ value: "extensions", quoted: false }],
      },
    ],
  );
});

test("auth.uid is SQL-derived as a manifest-required external function", () => {
  assert.deepEqual(deriveExternalFunctionDependencies("SELECT auth.uid();"), [
    {
      identifier: "auth.uid",
      registry: "MANIFEST_OBJECT",
      manifestRequired: true,
      occurrences: 1,
    },
  ]);
});

test("unknown qualified relations and functions fail closed", () => {
  expectClosureCode(
    () => deriveSynthetic("SELECT * FROM public.unregistered_dependency;"),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
  expectClosureCode(
    () => deriveSynthetic("SELECT unknown_schema.unregistered_function();"),
    "UNREGISTERED_EXTERNAL_FUNCTION",
  );
});

test("live migration filename-set mismatch fails", () => {
  const sql = new Map(liveSql);
  sql.delete(manifest.records[0].currentFilename);
  expectClosureCode(
    () => validateMigrationDependencyClosure(manifest, sql),
    "MIGRATION_SQL_MANIFEST_FILENAME_SET_MISMATCH",
  );
});

test("removing a manifest record fails", () => {
  const mutated = clone(manifest);
  mutated.records.shift();
  expectClosureCode(
    () => validateMigrationDependencyClosure(mutated, liveSql),
    "MIGRATION_SQL_MANIFEST_FILENAME_SET_MISMATCH",
  );
});

test("adding a synthetic manifest record fails", () => {
  const mutated = clone(manifest);
  mutated.records.push({
    ...clone(mutated.records.at(-1)),
    currentFilename: "20990101000000_synthetic.sql",
    currentVersionToken: "20990101000000",
    canonicalProposedVersionToken: "20990101000000",
    freshHistoryOrder: 26,
  });
  expectClosureCode(
    () => validateMigrationDependencyClosure(mutated, liveSql),
    "MIGRATION_SQL_MANIFEST_FILENAME_SET_MISMATCH",
  );
});

test("changing an exact predecessor fails bidirectional SQL comparison", () => {
  const mutated = clone(manifest);
  const record = mutated.records.find(
    (candidate) => candidate.exactDependencyPredecessors.length > 0,
  );
  record.exactDependencyPredecessors = [];
  expectClosureCode(
    () => validateMigrationDependencyClosure(mutated, liveSql),
    "MANIFEST_SQL_MISMATCH",
  );
});

test("consumer before producer fails closed", () => {
  expectClosureCode(
    () =>
      deriveMigrationDependencyClosure(
        [
          {
            currentFilename: "1_consumer.sql",
            presentOnLiveMain: true,
            freshHistoryOrder: 1,
          },
          {
            currentFilename: "2_producer.sql",
            presentOnLiveMain: true,
            freshHistoryOrder: 2,
          },
        ],
        new Map([
          ["1_consumer.sql", "SELECT * FROM public.later_table;"],
          ["2_producer.sql", "CREATE TABLE public.later_table(id integer);"],
        ]),
        { closedQualifiedDatabaseSchemas: ["public"] },
      ),
    "UNREGISTERED_QUALIFIED_DATABASE_OBJECT",
  );
});

test("UNKNOWN remote status blocks silent rename and repair", () => {
  const mutated = clone(manifest);
  const unknown = mutated.records.find(
    (record) => record.remoteApplicationStatus === "UNKNOWN",
  );
  unknown.filenameMutationEligibleInThisWork = true;
  expectClosureCode(
    () => validateMigrationDependencyClosure(mutated, liveSql),
    "REMOTE_HISTORY_MUTATION_REQUIRES_OWNER_GATE",
  );

  const repairMutant = clone(manifest);
  repairMutant.hardRules.unknownRemoteStatusAllowsRemoteRepair = true;
  expectClosureCode(
    () => validateMigrationDependencyClosure(repairMutant, liveSql),
    "REMOTE_MIGRATION_MUTATION_AUTHORITY_FORBIDDEN",
  );
});

test("every exclusion entry carries statement, span, role, kind, and components", () => {
  const exclusions = manifest.records.flatMap(
    (record) => record.identifierOccurrenceEvidence.exclusionOccurrences,
  );
  assert.ok(exclusions.length > 0);
  for (const occurrence of exclusions) {
    assert.ok(Number.isInteger(occurrence.statementOrdinal));
    assert.ok(Number.isInteger(occurrence.tokenStart));
    assert.ok(occurrence.tokenEnd > occurrence.tokenStart);
    assert.equal(occurrence.role, "index_target");
    assert.equal(occurrence.objectKind, "index");
    assert.ok(occurrence.normalizedComponents.length >= 1);
  }
});

test("identity-wide index suppression mutation fails occurrence evidence", () => {
  const mutated = clone(manifest);
  const record = mutated.records.find(
    (candidate) =>
      candidate.identifierOccurrenceEvidence.exclusionOccurrences.length > 0,
  );
  record.identifierOccurrenceEvidence.exclusionOccurrences[0].tokenEnd += 1;
  expectClosureCode(
    () => validateMigrationDependencyClosure(mutated, liveSql),
    "MANIFEST_SQL_MISMATCH",
  );
});

test("analyzer contains no semantic-name-only index exclusion authority", async () => {
  const source = await readFile(analyzerPath, "utf8");
  assert.equal(source.includes("deriveQualifiedIndexOperationIdentifiers"), false);
  assert.equal(
    /indexTargets\.has\(qualifiedSemanticKey/u.test(source),
    false,
  );
  assert.match(source, /sqlIdentifierOccurrenceIdentity\(indexTargetCandidate\)/u);
  assert.equal(
    manifest.migrationDependencyClosureV1.parserContract
      .semanticNameOnlyIndexExclusionAllowed,
    false,
  );
});

test("terminal donors remain metadata-only and are not current migration evidence", () => {
  assert.deepEqual(
    contract.authority.terminalDonors.map((donor) => donor.pullRequest),
    [770, 780, 782, 783, 784],
  );
  assert.ok(
    contract.authority.terminalDonors.every(
      (donor) => donor.state === "CLOSED_UNMERGED_READ_ONLY",
    ),
  );
  assert.equal(contract.authority.donorStateMayBePromotedAsCurrentEvidence, false);
  assert.equal(manifest.donorOnlyMigrationCount, 0);
  assert.ok(manifest.records.every((record) => record.presentOnLiveMain));
  assert.ok(manifest.records.every((record) => !record.donorOnly));
});

test("A0 installs no program selector, runtime, migration mutation, or activation", () => {
  assert.equal(contract.authority.programSelectorInstalledByThisWork, false);
  assert.equal(contract.authority.runtimeInstalledByThisWork, false);
  assert.equal(contract.authority.migrationMutationAuthorized, false);
  assert.deepEqual(contract.postMergeState, {
    c3rA0: "installed",
    c3rA1: "dependency_ready_unstarted",
    c3rP: "proposed_unstarted_not_repository_authorized",
    c3rT: "blocked",
    c3rL: "blocked",
    wcvC3: "incomplete",
    governedIssues: {
      706: "open",
      707: "open",
      708: "open",
      714: "open",
      781: "open",
    },
    successorWorkStarted: 0,
  });
  assert.ok(
    Object.values(contract.activationBoundary).every(
      (value) => value === false || value === 0,
    ),
  );
});

test("A0 owns exactly seven paths, is top-level authority, and is registered once", async () => {
  assert.deepEqual(contract.ownedPaths, [
    "AGENTS.md",
    "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md",
    "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    "scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs",
    "scripts/automation/validate-pr-contract.mjs",
    "tests/wcv-c3r-a0-migration-dependency-authority.test.mjs",
    "scripts/run-node-tests.mjs",
  ]);
  const decisionPath =
    "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md";
  assert.ok(agentsSource.indexOf(decisionPath) < agentsSource.indexOf(
    "docs/decisions/2026-08-17-owner-c2r-c-p-structural-practice-proof-recovery.md",
  ));
  assert.equal(
    runnerSource.match(
      /tests\/wcv-c3r-a0-migration-dependency-authority\.test\.mjs/gu,
    )?.length,
    1,
  );
  for (const relativePath of contract.ownedPaths) {
    assert.ok(
      (await readFile(path.join(repositoryRoot, relativePath), "utf8")).endsWith(
        "\n",
      ),
      `${relativePath} must end with a newline`,
    );
  }
});

test("exact pinned A0 PR accepts Refs #781 while preserving the open tracker", async () => {
  const result = await runPrContract(
    completePrBody(
      [
        "Refs #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    ),
  );
  assert.equal(result.status, 0, result.stderr);
});

test("A0 reference-only exception rejects closing keywords and missing disposition", async () => {
  const closingResult = await runPrContract(
    completePrBody(
      [
        "Refs #781",
        "Closes #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    ),
  );
  assert.notEqual(closingResult.status, 0);

  const missingDisposition = await runPrContract(
    completePrBody("Refs #781"),
  );
  assert.notEqual(missingDisposition.status, 0);
});

test("A0 reference-only exception is pinned against branch, title, base, and fork replay", async () => {
  const body = completePrBody(
    [
      "Refs #781",
      "- Tracker disposition: remains open; closure authority: C3R-L",
    ].join("\n"),
  );
  const mutants = [
    { title: "Unrelated PR" },
    {
      base: {
        ref: "main",
        sha: "0000000000000000000000000000000000000000",
      },
    },
    {
      head: {
        ref: "codex/wcv-c3r-a0-migration-dependency-authority",
        repo: { full_name: "attacker/inverge" },
      },
    },
    {
      head: {
        ref: "codex/unrelated",
        repo: { full_name: "chachathecat/inverge" },
      },
    },
  ];
  for (const mutant of mutants) {
    const result = await runPrContract(body, mutant);
    assert.notEqual(result.status, 0, JSON.stringify(mutant));
  }
});

test("unrelated PRs retain the ordinary exact-one closing-reference rule", async () => {
  const result = await runPrContract(
    completePrBody("Closes #123"),
    {
      title: "Ordinary PR",
      head: {
        ref: "feature/ordinary",
        repo: { full_name: "chachathecat/inverge" },
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
