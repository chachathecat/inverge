import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  C3RPMigrationMutationAuthorityError,
  canonicalJson,
  currentAuthorityChangedPaths,
  deriveCandidateDependencyRecords,
  evidenceForBytes,
  parseJsonRejectDuplicateKeys,
  sha256,
  shouldEnforceExactAuthorityChangedPaths,
  validateAuthorityContract,
  validateAppendSemanticSource,
  validateC3rPMigrationMutationReceipt,
  validateC3rPMigrationMutationReceiptSource,
  validateExactAuthorityChangedPaths,
  validateGitHubShallowPullRequestEvidence,
} from "../scripts/automation/wcv-c3-pre-p-migration-mutation-authority.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const contractPath = path.join(
  repositoryRoot,
  "config",
  "dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
);
const decisionPath = path.join(
  repositoryRoot,
  "docs",
  "decisions",
  "2026-08-22-owner-wcv-c3-pre-p-migration-mutation-authority.md",
);

const contractSource = await readFile(contractPath, "utf8");
const contract = parseJsonRejectDuplicateKeys(contractSource);
const a0Contract = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "config",
      "dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    ),
    "utf8",
  ),
);
const a1Contract = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "config",
      "dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
    ),
    "utf8",
  ),
);

function clone(value) {
  return structuredClone(value);
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(Buffer.from(`${domain}\0${canonicalJson(value)}`, "utf8"))
    .digest("hex");
}

function evidenceFromBaseline(record) {
  return {
    gitBlob: record.gitBlob,
    rawSha256: record.rawSha256,
    byteCount: record.byteCount,
    lineCount: record.lineCount,
    canonicalUtf8LfSha256: record.canonicalUtf8LfSha256,
  };
}

function expectedDependencies() {
  const prefix = "supabase/migrations/";
  const pathMap = new Map(
    contract.authorizedExistingPathOperations.records.map((operation) => [
      operation.currentPath,
      operation.futurePath,
    ]),
  );
  const mapped = (filename) =>
    pathMap.get(`${prefix}${filename}`) ?? `${prefix}${filename}`;
  const conceptPath =
    "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql";
  const records = new Map();
  for (const record of a0Contract.migrationHistoryCompatibilityManifestV1.records) {
    const currentPath = `${prefix}${record.currentFilename}`;
    const futurePath = mapped(record.currentFilename);
    records.set(futurePath, {
      path: futurePath,
      predecessors:
        currentPath === conceptPath
          ? clone(
              contract.effectiveMigrationInventoryAuthority
                .conceptEarlyBoundaryPredecessorsExactly,
            )
          : record.exactDependencyPredecessors.map(mapped),
    });
  }
  records.set(contract.frozenAppendAuthority.path, {
    path: contract.frozenAppendAuthority.path,
    predecessors: clone(
      contract.effectiveMigrationInventoryAuthority
        .appendRequiredDependencyPredecessorsExactly,
    ),
  });
  return contract.effectiveMigrationInventoryAuthority.effectivePathsExactly.map(
    (migrationPath) => records.get(migrationPath),
  );
}

function signReceipt(receipt) {
  const unsigned = clone(receipt);
  delete unsigned.receiptDigest;
  receipt.receiptDigest = domainDigest(
    "C3R_P_MIGRATION_MUTATION_RECEIPT_V1",
    unsigned,
  );
  return receipt;
}

function signAuthorityMergeReceipt(receipt) {
  const unsigned = clone(receipt);
  delete unsigned.receiptDigest;
  receipt.receiptDigest = domainDigest(
    "C3R_P_MIGRATION_MUTATION_AUTHORITY_MERGE_RECEIPT_V1",
    unsigned,
  );
  return receipt;
}

function fixtureGit(fixtureRoot, args) {
  const result = spawnSync("git", args, {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

function futureOperationBytes(operation, currentBytes) {
  if (operation.operationKind === "RENAME_ONLY") return currentBytes;
  if (operation.futureDerivation) {
    const current = currentBytes.toString("utf8").replace(/\r\n?/gu, "\n");
    const oldSegment = Buffer.from(
      operation.futureDerivation.oldSegmentBase64,
      "base64",
    ).toString("utf8");
    const replacement = Buffer.from(
      operation.futureDerivation.replacementSegmentBase64,
      "base64",
    ).toString("utf8");
    return Buffer.from(current.replace(oldSegment, replacement), "utf8");
  }
  return Buffer.from(operation.futureCanonicalUtf8LfBase64, "base64");
}

function createFutureCandidateFixture() {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "inverge-c3r-p-receipt-"),
  );
  for (const relativePath of [
    "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json",
    "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
    "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
    "docs/decisions/2026-08-22-owner-wcv-c3-pre-p-migration-mutation-authority.md",
  ]) {
    const target = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relativePath), target);
  }
  fs.cpSync(
    path.join(repositoryRoot, "supabase", "migrations"),
    path.join(fixtureRoot, "supabase", "migrations"),
    { recursive: true },
  );
  fixtureGit(fixtureRoot, ["init", "-b", "main"]);
  fixtureGit(fixtureRoot, ["config", "user.name", "Receipt Fixture"]);
  fixtureGit(fixtureRoot, ["config", "user.email", "fixture@example.invalid"]);
  fixtureGit(fixtureRoot, ["add", "."]);
  fixtureGit(fixtureRoot, ["commit", "-m", "authority base"]);
  const baseSha = fixtureGit(fixtureRoot, ["rev-parse", "HEAD"]);
  const baseTree = fixtureGit(fixtureRoot, ["rev-parse", "HEAD^{tree}"]);

  for (const operation of contract.authorizedExistingPathOperations.records) {
    const currentPath = path.join(fixtureRoot, operation.currentPath);
    const futurePath = path.join(fixtureRoot, operation.futurePath);
    const futureBytes = futureOperationBytes(
      operation,
      fs.readFileSync(currentPath),
    );
    if (operation.currentPath !== operation.futurePath) {
      fs.renameSync(currentPath, futurePath);
    }
    fs.writeFileSync(futurePath, futureBytes);
  }
  const appendSql = `create table public.c3r_p_practice_state (
  id uuid primary key,
  payload jsonb not null
);
alter table public.c3r_p_practice_state enable row level security;
alter table public.c3r_p_practice_state force row level security;
create policy c3r_p_practice_service_only on public.c3r_p_practice_state
  for all to service_role using (true) with check (true);
create function public.c3r_p_write_practice_state(payload jsonb)
returns jsonb language sql security definer set search_path = pg_catalog, public
as $$ select payload $$;
revoke all on function public.c3r_p_write_practice_state(jsonb) from public, anon, authenticated;
grant execute on function public.c3r_p_write_practice_state(jsonb) to service_role;
revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from public;
revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from anon;
grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to authenticated;
`;
  const appendPath = path.join(fixtureRoot, contract.frozenAppendAuthority.path);
  fs.writeFileSync(appendPath, appendSql, "utf8");
  fixtureGit(fixtureRoot, ["add", "."]);
  fixtureGit(fixtureRoot, ["commit", "-m", "future C3R-P candidate"]);
  return {
    fixtureRoot,
    baseSha,
    baseTree,
    head: fixtureGit(fixtureRoot, ["rev-parse", "HEAD"]),
    tree: fixtureGit(fixtureRoot, ["rev-parse", "HEAD^{tree}"]),
    appendBytes: Buffer.from(appendSql, "utf8"),
  };
}

const futureFixture = createFutureCandidateFixture();
test.after(() => {
  fs.rmSync(futureFixture.fixtureRoot, { recursive: true, force: true });
});

const independentCatalogArtifact = Object.freeze({
  schemas: [
    { identity: "auth", owner: "postgres", acl: ["postgres=UC/postgres"] },
    { identity: "public", owner: "postgres", acl: ["postgres=UC/postgres"] },
  ],
  relations: [
    {
      identity: "public.c3r_p_practice_state",
      kind: "r",
      owner: "postgres",
      acl: ["service_role=arwdDxt/postgres"],
      rlsEnabled: true,
      rlsForced: true,
      columnClosureSha256: sha256(Buffer.from("practice-columns", "utf8")),
      constraintClosureSha256: sha256(Buffer.from("practice-constraints", "utf8")),
      indexClosureSha256: sha256(Buffer.from("practice-indexes", "utf8")),
      triggerClosureSha256: sha256(Buffer.from("practice-triggers", "utf8")),
    },
    {
      identity: "public.legacy_unforced_state",
      kind: "r",
      owner: "legacy_owner",
      acl: ["legacy_owner=arwdDxt/legacy_owner"],
      rlsEnabled: true,
      rlsForced: false,
      columnClosureSha256: sha256(Buffer.from("legacy-columns", "utf8")),
      constraintClosureSha256: sha256(Buffer.from("legacy-constraints", "utf8")),
      indexClosureSha256: sha256(Buffer.from("legacy-indexes", "utf8")),
      triggerClosureSha256: sha256(Buffer.from("legacy-triggers", "utf8")),
    },
  ],
  routines: [
    {
      identity: "public.c3r_p_write_practice_state(jsonb)",
      identityArguments: "jsonb",
      resultType: "jsonb",
      language: "plpgsql",
      volatility: "VOLATILE",
      securityDefiner: true,
      owner: "postgres",
      acl: ["service_role=X/postgres"],
      definitionSha256: sha256(Buffer.from("practice-routine", "utf8")),
    },
    {
      identity:
        "public.transition_personal_concept_node_v1(text,text,text,text,text,text,text,text,integer,timestamp with time zone)",
      identityArguments:
        "text,text,text,text,text,text,text,text,integer,timestamptz",
      resultType: "record",
      language: "plpgsql",
      volatility: "VOLATILE",
      securityDefiner: true,
      owner: "postgres",
      acl: ["authenticated=X/postgres"],
      definitionSha256: sha256(Buffer.from("transition-routine", "utf8")),
    },
  ],
  policies: [
    {
      relationIdentity: "public.c3r_p_practice_state",
      name: "c3r_p_practice_service_only",
      permissive: true,
      command: "ALL",
      roles: ["service_role"],
      usingExpressionSha256: sha256(Buffer.from("true", "utf8")),
      withCheckExpressionSha256: sha256(Buffer.from("true", "utf8")),
    },
  ],
});

async function trustedEvidenceVerifier({ receipt }) {
  const head = receipt.c3rPHeadBinding;
  return {
    repository: head.repository,
    pullRequest: head.pullRequest,
    baseSha: head.baseSha,
    baseTree: head.baseTree,
    candidateHead: head.candidateHead,
    candidateTree: head.candidateTree,
    currentPullRequestHead: true,
    requiredNativeChecksPassed: true,
    formalReviewActionableP0P1P2: [0, 0, 0],
    unresolvedActionableThreadCount: 0,
    resetReceiptIds: receipt.isolatedResetReplayReceipts.map(
      (reset) => reset.receiptId,
    ),
    metadataArtifacts: clone(receipt.metadataOnlyArtifactRefs),
    finalDatabaseStateRootDigest: receipt.finalDatabaseState.rootDigest,
    practiceRuntimeEvidenceDigest:
      receipt.practiceRuntimeReceipt.evidenceDigest,
    postgresOracleCandidateArtifactSha256:
      receipt.postgresOracleBinding.candidateRuntimeArtifactSha256,
    fullCanonicalCatalogValidated: true,
    catalogScope: receipt.finalDatabaseState.catalogScope,
    catalogQueryManifestSha256:
      receipt.finalDatabaseState.catalogQueryManifestSha256,
    catalogRecordCounts: clone(receipt.finalDatabaseState.recordCounts),
    catalogIdentityClosureDigest:
      receipt.finalDatabaseState.identityClosureDigest,
    fullCatalog: {
      artifactRef: "artifact://metadata/4",
      artifactSha256: sha256(Buffer.from("FINAL_DATABASE_STATE", "utf8")),
      catalogScope: "FULL_FRESH_DATABASE_POST_C3R_P",
      catalogQueryManifestSha256:
        contract.immutableUpstreamAuthority.postgresqlOracleArtifacts.manifest
          .sha256,
      ...clone(independentCatalogArtifact),
    },
    remoteMutationCount: 0,
  };
}

async function trustedAuthorityMergeReceiptVerifier({ authorityMergeReceipt }) {
  return clone(authorityMergeReceipt);
}

async function validReceipt() {
  const schema = contract.c3rPMigrationMutationReceiptV1;
  const head = futureFixture.head;
  const tree = futureFixture.tree;
  const operations = contract.authorizedExistingPathOperations.records.map(
    (operation) => ({
      operationId: operation.operationId,
      operationKind: operation.operationKind,
      currentPath: operation.currentPath,
      futurePath: operation.futurePath,
      remoteClassification: operation.remoteClassification,
      currentEvidence: clone(operation.currentEvidence),
      futureEvidence: clone(operation.futureEvidence),
      transformationProofSha256: domainDigest(
        "C3R_P_EXISTING_PATH_OPERATION_V1",
        operation,
      ),
    }),
  );
  const baselineByPath = new Map(
    contract.currentMigrationBaseline.records.map((record) => [
      record.path,
      record,
    ]),
  );
  const unchangedRecords =
    contract.effectiveMigrationInventoryAuthority.unchangedPathsExactly.map(
      (migrationPath) => ({
        path: migrationPath,
        evidence: evidenceFromBaseline(baselineByPath.get(migrationPath)),
      }),
    );
  const appendEvidence = evidenceForBytes(futureFixture.appendBytes);
  const futureEvidence = new Map(
    operations.map((operation) => [
      operation.futurePath,
      operation.futureEvidence,
    ]),
  );
  for (const record of unchangedRecords) {
    futureEvidence.set(record.path, record.evidence);
  }
  futureEvidence.set(contract.frozenAppendAuthority.path, appendEvidence);
  const inventoryRecords =
    contract.effectiveMigrationInventoryAuthority.effectivePathsExactly.map(
      (migrationPath) => ({
        path: migrationPath,
        evidence: clone(futureEvidence.get(migrationPath)),
      }),
    );
  const inventoryDigest = domainDigest(
    "C3R_P_EFFECTIVE_INVENTORY_V1",
    inventoryRecords,
  );
  const dependencies = expectedDependencies();
  const sourceDerivedDependencies = deriveCandidateDependencyRecords(
    contract,
    a0Contract,
    futureFixture.fixtureRoot,
    futureFixture.head,
  );
  const dependencyDigest = domainDigest(
    "C3R_P_DEPENDENCY_ORDERING_CLOSURE_V1",
    dependencies,
  );
  const resetReceipts = [1, 2].map((cycle) => {
    const reset = {
      receiptId: `isolated-reset-${cycle}`,
      cycle,
      artifactRef: `artifact://metadata/${cycle}`,
      candidateHead: head,
      candidateTree: tree,
      inventoryDigest,
      dependencyClosureDigest: dependencyDigest,
      executedMigrationCount: 26,
      serverVersionNum: 150008,
      freshDatabase: true,
      linkedRemote: false,
      success: true,
      cleanupComplete: true,
      metadataOnly: true,
      remoteMutationCount: 0,
      receiptDigest: "",
    };
    const unsigned = clone(reset);
    delete unsigned.receiptDigest;
    reset.receiptDigest = domainDigest(
      "C3R_P_ISOLATED_RESET_REPLAY_V1",
      unsigned,
    );
    return reset;
  });
  const { schemas, relations, routines, policies } =
    clone(independentCatalogArtifact);
  const collectionDigests = {
    schemas: domainDigest("C3R_P_FINAL_SCHEMAS_V1", schemas),
    relations: domainDigest("C3R_P_FINAL_RELATIONS_V1", relations),
    routines: domainDigest("C3R_P_FINAL_ROUTINES_V1", routines),
    policies: domainDigest("C3R_P_FINAL_POLICIES_V1", policies),
  };
  const finalRoot = domainDigest(
    "C3R_P_FINAL_DATABASE_STATE_V1",
    collectionDigests,
  );
  const recordCounts = {
    schemas: schemas.length,
    relations: relations.length,
    routines: routines.length,
    policies: policies.length,
  };
  const identityClosureDigest = domainDigest(
    "C3R_P_FULL_CATALOG_IDENTITY_CLOSURE_V1",
    {
      schemas: schemas.map((entry) => entry.identity),
      relations: relations.map((entry) => entry.identity),
      routines: routines.map((entry) => entry.identity),
      policies: policies.map(
        (entry) => `${entry.relationIdentity}::${entry.name}`,
      ),
    },
  );
  const perSubjectIssueEvidence = [];
  for (const issue of [706, 707, 708]) {
    for (const evidenceKey of
      a1Contract.issueAllocation.issues[String(issue)]
        .requiredForEachSubjectExactly) {
      perSubjectIssueEvidence.push({
        issue,
        evidenceKey,
        runtimeEvidenceRef: `artifact://practice/${issue}/${evidenceKey}`,
      });
    }
  }
  const renamed = contract.authorizedExistingPathOperations.records.filter(
    (operation) => operation.currentPath !== operation.futurePath,
  );
  const remoteContinuity = Object.fromEntries(
    schema.nestedRequiredFieldsExactly.remoteContinuity.map((field) => [field, 0]),
  );
  const dataBoundary = Object.fromEntries(
    schema.nestedRequiredFieldsExactly.dataBoundary.map((field) => [
      field,
      field === "metadataOnly",
    ]),
  );
  const upstreamOracle =
    contract.immutableUpstreamAuthority.postgresqlOracleValidatedReceipt;
  const oracleManifest =
    contract.immutableUpstreamAuthority.postgresqlOracleArtifacts.manifest;
  const receipt = {
    receiptType: "C3RPMigrationMutationReceiptV1",
    authorityBinding: {
      decisionRef: contract.authority.decisionRecord,
      decisionSha256: sha256(await readFile(decisionPath)),
      contractRef:
        "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
      contractSha256: sha256(await readFile(contractPath)),
    },
    authorityMergeReceipt: signAuthorityMergeReceipt({
      receiptType: "C3RPMigrationMutationAuthorityMergeReceiptV1",
      repository: "chachathecat/inverge",
      authorityPullRequest: 795,
      reconciledBaseSha: contract.authority.reconciledBaseSha,
      reconciledBaseTree: contract.authority.reconciledBaseTree,
      reviewedHead: "a".repeat(40),
      reviewedTree: "b".repeat(40),
      squashMergeCommit: futureFixture.baseSha,
      resultingMainSha: futureFixture.baseSha,
      resultingMainTree: futureFixture.baseTree,
      decisionRef: contract.authority.decisionRecord,
      decisionSha256: sha256(await readFile(decisionPath)),
      contractRef:
        "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
      contractSha256: sha256(await readFile(contractPath)),
      expectedHeadPinnedSquashMerge: true,
      requiredNativeChecksPassed: true,
      formalReviewActionableP0P1P2: [0, 0, 0],
      unresolvedActionableThreadCount: 0,
      authorityReceiptValidated: true,
      migrationFileChangeCount: 0,
      remoteMutationCount: 0,
      receiptDigest: "",
    }),
    c3rPHeadBinding: {
      repository: "chachathecat/inverge",
      stage: "C3R-P",
      pullRequest: 999,
      baseSha: futureFixture.baseSha,
      baseTree: futureFixture.baseTree,
      candidateHead: head,
      candidateTree: tree,
      headTreeBindingSha256: sha256(
        Buffer.from(`${head}\n${tree}\n`, "utf8"),
      ),
    },
    existingPathOperations: operations,
    unchangedPathClosure: {
      count: 18,
      records: unchangedRecords,
      closureDigest: domainDigest(
        "C3R_P_UNCHANGED_PATH_CLOSURE_V1",
        unchangedRecords,
      ),
    },
    append: {
      path: contract.frozenAppendAuthority.path,
      version: contract.frozenAppendAuthority.version,
      purposeExactly: clone(contract.frozenAppendAuthority.purposeExactly),
      evidence: appendEvidence,
      dependencyPredecessors: clone(
        contract.effectiveMigrationInventoryAuthority
          .appendRequiredDependencyPredecessorsExactly,
      ),
      remoteApplicationAuthorized: false,
      migrationHistoryRepairAuthorized: false,
    },
    effectiveInventory: {
      count: 26,
      records: inventoryRecords,
      inventoryDigest,
      renamedOldPathsRemoved: renamed.map((operation) => operation.currentPath),
      renamedNewPathsAdded: renamed.map((operation) => operation.futurePath),
      inPlaceRepairedPaths: [
        contract.authorizedExistingPathOperations.records[6].currentPath,
      ],
      appendPathsAdded: [contract.frozenAppendAuthority.path],
      unmatchedDeletionCount: 0,
      secondAppendCount: 0,
    },
    dependencyAndOrderingClosure: {
      a0AnalyzerBinding:
        contract.immutableUpstreamAuthority.c3rA0Artifacts.analyzer.sha256,
      orderedPaths: clone(
        contract.effectiveMigrationInventoryAuthority.effectivePathsExactly,
      ),
      records: dependencies,
      closureDigest: dependencyDigest,
      sourceDerivedRecords: sourceDerivedDependencies,
      sourceDerivedClosureDigest: domainDigest(
        "C3R_P_SOURCE_DERIVED_DEPENDENCY_CLOSURE_V1",
        sourceDerivedDependencies,
      ),
      duplicateVersionCount: 0,
      missingDependencyCount: 0,
      unknownDependencyCount: 0,
      cycleCount: 0,
      orderingErrorCount: 0,
      unsupportedOperationCount: 0,
    },
    isolatedResetReplayReceipts: resetReceipts,
    postgresOracleBinding: {
      pullRequest: upstreamOracle.pullRequest,
      resultingMainSha: upstreamOracle.resultingMainSha,
      resultingMainTree: upstreamOracle.resultingMainTree,
      manifestGitBlob: oracleManifest.gitBlob,
      manifestSha256: oracleManifest.sha256,
      fixtureCount: upstreamOracle.fixtureCount,
      fixtureSetSha256: upstreamOracle.fixtureSetSha256,
      serverVersionNum: upstreamOracle.serverVersionNum,
      runtimeArtifactSha256: upstreamOracle.runtimeArtifactSha256,
      candidateRuntimeArtifactRef: "artifact://metadata/3",
      candidateRuntimeArtifactSha256: sha256(
        Buffer.from("POSTGRESQL_ORACLE", "utf8"),
      ),
    },
    finalDatabaseState: {
      catalogScope: "FULL_FRESH_DATABASE_POST_C3R_P",
      catalogQueryManifestSha256: oracleManifest.sha256,
      schemas,
      relations,
      routines,
      policies,
      recordCounts,
      identityClosureDigest,
      collectionDigests,
      rootDigest: finalRoot,
      sourceDerivedExpectedStateDigest: finalRoot,
      resetCycleStateDigests: [finalRoot, finalRoot],
      laterDisableRlsOperationCount: 0,
      laterNoForceRlsOperationCount: 0,
    },
    practiceRuntimeReceipt: {
      receiptType: "C3RPracticeRuntimeEvidenceReceiptV1",
      stage: "C3R-P",
      subject: "PRACTICE",
      candidateHead: head,
      candidateTree: tree,
      practiceEvidenceRefs: ["artifact://practice/runtime"],
      browserToPostgresEvidenceRef: "artifact://practice/browser-to-postgres",
      perSubjectIssueEvidence,
      evidenceDigest: domainDigest(
        "C3R_P_PRACTICE_RUNTIME_EVIDENCE_V1",
        perSubjectIssueEvidence,
      ),
      featureDefaultOff: true,
      metadataOnly: true,
      remoteMutationCount: 0,
    },
    metadataOnlyArtifactRefs:
      schema.metadataArtifactKindsExactly.map((kind, index) => ({
        kind,
        ref: `artifact://metadata/${index + 1}`,
        sha256: sha256(Buffer.from(kind, "utf8")),
      })),
    dataBoundary,
    cleanup: {
      complete: true,
      residualIsolatedResourceCount: 0,
      residualCredentialCount: 0,
      evidenceSha256: sha256(Buffer.from("cleanup-complete", "utf8")),
    },
    remoteContinuity,
    receiptDigest: "",
  };
  return signReceipt(receipt);
}

function recomputeFinalDatabaseState(receipt) {
  const state = receipt.finalDatabaseState;
  state.recordCounts = {
    schemas: state.schemas.length,
    relations: state.relations.length,
    routines: state.routines.length,
    policies: state.policies.length,
  };
  state.identityClosureDigest = domainDigest(
    "C3R_P_FULL_CATALOG_IDENTITY_CLOSURE_V1",
    {
      schemas: state.schemas.map((entry) => entry.identity),
      relations: state.relations.map((entry) => entry.identity),
      routines: state.routines.map((entry) => entry.identity),
      policies: state.policies.map(
        (entry) => `${entry.relationIdentity}::${entry.name}`,
      ),
    },
  );
  state.collectionDigests = {
    schemas: domainDigest("C3R_P_FINAL_SCHEMAS_V1", state.schemas),
    relations: domainDigest("C3R_P_FINAL_RELATIONS_V1", state.relations),
    routines: domainDigest("C3R_P_FINAL_ROUTINES_V1", state.routines),
    policies: domainDigest("C3R_P_FINAL_POLICIES_V1", state.policies),
  };
  state.rootDigest = domainDigest(
    "C3R_P_FINAL_DATABASE_STATE_V1",
    state.collectionDigests,
  );
  state.sourceDerivedExpectedStateDigest = state.rootDigest;
  state.resetCycleStateDigests = [state.rootDigest, state.rootDigest];
  return signReceipt(receipt);
}

async function expectAuthorityCode(mutator, code) {
  const candidate = clone(contract);
  mutator(candidate);
  await assert.rejects(
    validateAuthorityContract(candidate, { repositoryRoot }),
    (error) =>
      error instanceof C3RPMigrationMutationAuthorityError &&
      error.code === code,
  );
}

async function expectReceiptCode(mutator, code) {
  const receipt = await validReceipt();
  mutator(receipt);
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(receipt, contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
      evidenceVerifier: trustedEvidenceVerifier,
    }),
    (error) =>
      error instanceof C3RPMigrationMutationAuthorityError &&
      error.code === code,
  );
}

test("validates the exact source-only authority and A0 25-file baseline", async () => {
  const result = await validateAuthorityContract(contract, { repositoryRoot });
  assert.deepEqual(result, {
    contractId: "C3RPMigrationMutationAuthorityV1",
    currentMigrationCount: 25,
    authorizedExistingPathOperationCount: 7,
    renameCount: 6,
    contentRepairCount: 2,
    frozenAppendPath:
      "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql",
    effectiveMigrationCount: 26,
    a0ValidatedMigrationCount: 25,
    remoteOperationAuthorizationCount: 0,
    stageSelectorChangeCount: 0,
  });
});

test("pins exact prospective repair bytes while all migration paths remain unowned", () => {
  const [personal, ...rest] =
    contract.authorizedExistingPathOperations.records;
  const concept = rest.at(-1);
  assert.equal(personal.futureEvidence.rawSha256,
    "957fb9810283086e75ce34689b3eee2c2d3be4373dc341056630db716457b815");
  assert.equal(personal.futureEvidence.byteCount, 4991);
  assert.equal(concept.futureEvidence.rawSha256,
    "f5feb973cbc25cd8392158daf4f4c58227a776266f8b4f196c1f253eda39ee92");
  assert.equal(concept.futureEvidence.byteCount, 829);
  for (const operation of rest.slice(0, 5)) {
    assert.deepEqual(operation.futureEvidence, operation.currentEvidence);
  }
  assert.equal(
    contract.ownedPaths.some((ownedPath) =>
      ownedPath.startsWith("supabase/migrations/")),
    false,
  );
});

test("canonicalizes the transition source alias to the PostgreSQL catalog identity", () => {
  const result = validateAppendSemanticSource(futureFixture.appendBytes, contract);
  assert.equal(
    result.transitionIdentity,
    "public.transition_personal_concept_node_v1(text,text,text,text,text,text,text,text,integer,timestamp with time zone)",
  );
});

test("pins the closed append routine-body mutation authority", () => {
  assert.deepEqual(
    contract.frozenAppendAuthority.appendRoutineBodyStaticDmlAllowedExactly,
    ["INSERT", "UPDATE", "DELETE"],
  );
  assert.equal(
    contract.frozenAppendAuthority.appendRoutineBodyDmlTargetScopeExactly,
    "APPEND_CREATED_RELATIONS_ONLY",
  );
  assert.equal(
    contract.frozenAppendAuthority.appendRoutineBodyHistoricalRelationDmlAuthorized,
    false,
  );
  assert.equal(
    contract.frozenAppendAuthority.appendRoutineBodyDdlAuthorized,
    false,
  );
  assert.equal(
    contract.frozenAppendAuthority.appendRoutineBodyMergeAuthorized,
    false,
  );
});

test("routine-body mutation scope rejects historical targets at every nesting depth", () => {
  const source = futureFixture.appendBytes.toString("utf8");
  const withBody = (body) =>
    source.replace(
      "as $$ select payload $$;",
      () => `as $$ ${body} $$;`,
    );
  const historicalCases = [
    [
      `with deleted as (
        delete from public.personal_concept_nodes returning *
      )
      select payload`,
      "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
    ],
    [
      "delete from public.personal_concept_nodes returning payload",
      "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
    ],
    [
      "update public.personal_learning_states set state = state returning payload",
      "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
    ],
    [
      "insert into public.review_os_sessions (payload) values (payload) returning payload",
      "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
    ],
    [
      "select $nested$ with deleted as (delete from public.personal_concept_nodes returning *) select payload $nested$",
      "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
    ],
  ];
  for (const [body, code] of historicalCases) {
    assert.throws(
      () => validateAppendSemanticSource(Buffer.from(withBody(body)), contract),
      (error) => error.code === code,
      `${body} must fail closed`,
    );
  }
});

test("routine-body mutation scope rejects DDL, MERGE, and unresolved targets", () => {
  const source = futureFixture.appendBytes.toString("utf8");
  const withBody = (body) =>
    source.replace(
      "as $$ select payload $$;",
      () => `as $$ ${body} $$;`,
    );
  for (const keyword of [
    "create",
    "alter",
    "drop",
    "truncate",
    "copy",
    "grant",
    "revoke",
    "call",
    "do",
  ]) {
    assert.throws(
      () =>
        validateAppendSemanticSource(
          Buffer.from(withBody(`${keyword} public.c3r_p_practice_state`)),
          contract,
        ),
      (error) => error.code === "RECEIPT_APPEND_ROUTINE_BODY_DDL",
      `${keyword.toUpperCase()} must fail closed`,
    );
  }
  assert.throws(
    () =>
      validateAppendSemanticSource(
        Buffer.from(
          withBody(
            "merge into public.c3r_p_practice_state using public.c3r_p_practice_state on true when matched then update set payload = payload",
          ),
        ),
        contract,
      ),
    (error) => error.code === "RECEIPT_APPEND_ROUTINE_BODY_MERGE",
  );
  for (const body of [
    "delete from personal_concept_nodes returning payload",
    "with changed as (update only set payload = payload returning *) select payload",
  ]) {
    assert.throws(
      () => validateAppendSemanticSource(Buffer.from(withBody(body)), contract),
      (error) =>
        error.code ===
        "RECEIPT_APPEND_ROUTINE_BODY_DML_TARGET_UNRESOLVED",
      `${body} must fail closed`,
    );
  }
});

test("routine-body mutation scope ignores comments and strings and allows append-created DML", () => {
  const source = futureFixture.appendBytes.toString("utf8");
  const withBody = (body) =>
    Buffer.from(
      source.replace(
        "as $$ select payload $$;",
        () => `as $$ ${body} $$;`,
      ),
      "utf8",
    );
  assert.doesNotThrow(() =>
    validateAppendSemanticSource(
      withBody(`select 'DELETE FROM public.personal_concept_nodes';
        -- UPDATE public.personal_learning_states
        /* INSERT INTO public.review_os_sessions */
        select payload`),
      contract,
    ),
  );
  for (const body of [
    "insert into public.c3r_p_practice_state (id, payload) values (gen_random_uuid(), payload) returning payload",
    "update public.c3r_p_practice_state set payload = payload returning payload",
    "delete from public.c3r_p_practice_state where false returning payload",
  ]) {
    assert.doesNotThrow(
      () => validateAppendSemanticSource(withBody(body), contract),
      `${body} must be accepted for the append-created relation`,
    );
  }
});

test("rejects duplicate JSON keys before parsing", () => {
  assert.throws(
    () => parseJsonRejectDuplicateKeys('{"a":1,"a":2}'),
    (error) => error.code === "DUPLICATE_JSON_KEY",
  );
});

test("rejects a remote authorization", async () => {
  await expectAuthorityCode(
    (candidate) => {
      candidate.remoteContinuityBoundary.remoteSqlAuthorized = true;
    },
    "REMOTE_AUTHORIZATION_NONZERO",
  );
});

test("rejects a selector or runtime start", async () => {
  await expectAuthorityCode(
    (candidate) => {
      candidate.stageState.c3rP = "started";
    },
    "STAGE_STATE_DRIFT",
  );
});

test("rejects a second append permission", async () => {
  await expectAuthorityCode(
    (candidate) => {
      candidate.frozenAppendAuthority.secondAppendAllowed = true;
    },
    "FROZEN_APPEND_IDENTITY",
  );
});

test("rejects an unknown nested authority field through the canonical closure", async () => {
  await expectAuthorityCode(
    (candidate) => {
      candidate.authority.openEndedPermission = true;
    },
    "AUTHORITY_CONTRACT_CANONICAL_DIGEST",
  );
});

test("rejects an actual changed path outside the frozen 12-path manifest", () => {
  assert.doesNotThrow(() =>
    validateExactAuthorityChangedPaths(clone(contract.ownedPaths), contract),
  );
  assert.throws(
    () =>
      validateExactAuthorityChangedPaths(
        [...contract.ownedPaths, "app/hostile-runtime.ts"],
        contract,
      ),
    (error) => error.code === "ACTUAL_CHANGED_PATH_CLOSURE",
  );
});

test("exact 12-path diff enforcement is scoped only to this authority candidate", () => {
  const authorityBranch =
    "codex/wcv-c3-pre-p-migration-mutation-authority";
  assert.equal(
    shouldEnforceExactAuthorityChangedPaths(
      { currentBranch: authorityBranch },
      authorityBranch,
    ),
    true,
  );
  assert.equal(
    shouldEnforceExactAuthorityChangedPaths(
      { currentBranch: "codex/c3r-p", githubHeadRef: "codex/c3r-p" },
      authorityBranch,
    ),
    false,
  );
  assert.equal(
    shouldEnforceExactAuthorityChangedPaths(
      { currentBranch: "main" },
      authorityBranch,
    ),
    false,
  );
});

test("accepts the pinned base through exact GitHub shallow PR evidence", () => {
  const headSha = "ce8520d6fbd70b1bd3f92510485343d553aa8627";
  const mergeSha = "487460a69de97562c3f26e9703f6bfe8cf853b23";
  const eventPayload = {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      base: {
        ref: "main",
        sha: contract.authority.reconciledBaseSha,
        repo: { full_name: "chachathecat/inverge" },
      },
      head: {
        ref: "codex/wcv-c3-pre-p-migration-mutation-authority",
        sha: headSha,
        repo: { full_name: "chachathecat/inverge" },
      },
      changed_files: contract.ownedPaths.length,
    },
  };
  const result = validateGitHubShallowPullRequestEvidence({
    contract,
    eventPayload,
    currentCommit: mergeSha,
    currentCommitObject:
      `tree 186a4871925de726b55fb4d6f9f573592f1498d7\n` +
      `parent ${contract.authority.reconciledBaseSha}\n` +
      `parent ${headSha}\n`,
    githubSha: mergeSha,
  });
  assert.deepEqual(result, {
    commit: contract.authority.reconciledBaseSha,
    tree: contract.authority.reconciledBaseTree,
    gitHistoryAvailable: false,
    verificationMode: "github_pull_request_shallow_event",
  });
});

test("rejects incomplete GitHub shallow PR base evidence", () => {
  const headSha = "ce8520d6fbd70b1bd3f92510485343d553aa8627";
  const mergeSha = "487460a69de97562c3f26e9703f6bfe8cf853b23";
  assert.throws(
    () =>
      validateGitHubShallowPullRequestEvidence({
        contract,
        eventPayload: {
          repository: { full_name: "chachathecat/inverge" },
          pull_request: {
            base: {
              ref: "main",
              sha: contract.authority.reconciledBaseSha,
              repo: { full_name: "chachathecat/inverge" },
            },
            head: {
              ref: "codex/wcv-c3-pre-p-migration-mutation-authority",
              sha: headSha,
              repo: { full_name: "chachathecat/inverge" },
            },
            changed_files: contract.ownedPaths.length + 1,
          },
        },
        currentCommit: mergeSha,
        currentCommitObject:
          `tree 186a4871925de726b55fb4d6f9f573592f1498d7\n` +
          `parent ${contract.authority.reconciledBaseSha}\n` +
          `parent ${headSha}\n`,
        githubSha: mergeSha,
      }),
    (error) => error.code === "AUTHORITY_SHALLOW_BASE_EVIDENCE",
  );
});

test("derives the exact path diff after a pinned-base fetch into a genuine shallow merge checkout", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "inverge-c3r-pre-p-shallow-"),
  );
  const sourceRoot = path.join(fixtureRoot, "source");
  const remoteRoot = path.join(fixtureRoot, "remote.git");
  const checkoutRoot = path.join(fixtureRoot, "checkout");
  try {
    fs.mkdirSync(sourceRoot, { recursive: true });
    fixtureGit(sourceRoot, ["init", "-b", "main"]);
    fixtureGit(sourceRoot, ["config", "user.name", "Shallow Fixture"]);
    fixtureGit(sourceRoot, ["config", "user.email", "fixture@example.invalid"]);
    fs.writeFileSync(path.join(sourceRoot, "owned.txt"), "base\n", "utf8");
    fs.writeFileSync(path.join(sourceRoot, "stable.txt"), "stable\n", "utf8");
    fixtureGit(sourceRoot, ["add", "."]);
    fixtureGit(sourceRoot, ["commit", "-m", "base"]);
    const baseSha = fixtureGit(sourceRoot, ["rev-parse", "HEAD"]);
    fixtureGit(sourceRoot, ["switch", "-c", "candidate"]);
    fs.writeFileSync(path.join(sourceRoot, "owned.txt"), "candidate\n", "utf8");
    fixtureGit(sourceRoot, ["add", "owned.txt"]);
    fixtureGit(sourceRoot, ["commit", "-m", "candidate"]);
    fixtureGit(sourceRoot, ["switch", "main"]);
    fixtureGit(sourceRoot, ["merge", "--no-ff", "candidate", "-m", "merge"]);
    fixtureGit(fixtureRoot, ["clone", "--bare", sourceRoot, remoteRoot]);
    fixtureGit(fixtureRoot, [
      "clone",
      "--depth=1",
      "--branch",
      "main",
      pathToFileURL(remoteRoot).href,
      checkoutRoot,
    ]);
    assert.equal(
      fixtureGit(checkoutRoot, ["rev-parse", "--is-shallow-repository"]),
      "true",
    );
    const beforeFetch = spawnSync("git", ["cat-file", "-e", `${baseSha}^{commit}`], {
      cwd: checkoutRoot,
      encoding: "utf8",
    });
    assert.notEqual(beforeFetch.status, 0);
    fixtureGit(checkoutRoot, [
      "fetch",
      "--no-tags",
      "--depth=1",
      "origin",
      baseSha,
    ]);
    assert.deepEqual(currentAuthorityChangedPaths(checkoutRoot, baseSha), [
      "owned.txt",
    ]);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("accepts a completely closed future migration receipt", async () => {
  const result = await validateC3rPMigrationMutationReceipt(
    await validReceipt(),
    contract,
    {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
      evidenceVerifier: trustedEvidenceVerifier,
    },
  );
  assert.deepEqual(result, {
    receiptType: "C3RPMigrationMutationReceiptV1",
    authorityPullRequest: 795,
    authorityResultingMainSha: futureFixture.baseSha,
    existingPathOperationCount: 7,
    unchangedPathCount: 18,
    effectiveMigrationCount: 26,
    resetReplayCount: 2,
    serverVersionNum: 150008,
    remoteMutationCount: 0,
  });
});

test("receipt rejects unknown top-level fields", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.unknown = true;
    },
    "RECEIPT_TOP_LEVEL_FIELDS",
  );
});

test("raw receipt parsing rejects a nested duplicate key", async () => {
  const source = JSON.stringify(await validReceipt()).replace(
    '"repository":"chachathecat/inverge"',
    '"repository":"chachathecat/inverge","repository":"hostile/fork"',
  );
  await assert.rejects(
    validateC3rPMigrationMutationReceiptSource(source, contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
      evidenceVerifier: trustedEvidenceVerifier,
    }),
    (error) => error.code === "DUPLICATE_JSON_KEY",
  );
});

test("receipt refuses self-attested evidence without an independent verifier", async () => {
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(await validReceipt(), contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
    }),
    (error) =>
      error.code === "RECEIPT_INDEPENDENT_EVIDENCE_VERIFIER_REQUIRED",
  );
});

test("receipt requires independent validation of the prior authority merge", async () => {
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(await validReceipt(), contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      evidenceVerifier: trustedEvidenceVerifier,
    }),
    (error) => error.code === "RECEIPT_AUTHORITY_MERGE_VERIFIER_REQUIRED",
  );
});

test("receipt binds C3R-P base exactly to validated authority resulting main", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.authorityMergeReceipt.resultingMainSha = "c".repeat(40);
      receipt.authorityMergeReceipt.squashMergeCommit = "c".repeat(40);
      receipt.authorityMergeReceipt.receiptDigest = domainDigest(
        "C3R_P_MIGRATION_MUTATION_AUTHORITY_MERGE_RECEIPT_V1",
        Object.fromEntries(
          Object.entries(receipt.authorityMergeReceipt).filter(
            ([key]) => key !== "receiptDigest",
          ),
        ),
      );
    },
    "RECEIPT_AUTHORITY_MERGE_BASE_BINDING",
  );
});

test("receipt rejects authority merge review drift and verifier mismatch", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.authorityMergeReceipt.formalReviewActionableP0P1P2 = [0, 1, 0];
      receipt.authorityMergeReceipt.receiptDigest = domainDigest(
        "C3R_P_MIGRATION_MUTATION_AUTHORITY_MERGE_RECEIPT_V1",
        Object.fromEntries(
          Object.entries(receipt.authorityMergeReceipt).filter(
            ([key]) => key !== "receiptDigest",
          ),
        ),
      );
    },
    "RECEIPT_AUTHORITY_MERGE_BINDING",
  );
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(await validReceipt(), contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: async ({ authorityMergeReceipt }) => ({
        ...authorityMergeReceipt,
        authorityReceiptValidated: false,
      }),
      evidenceVerifier: trustedEvidenceVerifier,
    }),
    (error) => error.code === "RECEIPT_AUTHORITY_MERGE_VERIFIER_MISMATCH",
  );
});

test("append source rejects trailing unsafe grants, policies, and missing exact concept revokes", () => {
  const source = futureFixture.appendBytes.toString("utf8");
  for (const [mutant, code] of [
    [
      `${source}\ngrant execute on function public.c3r_p_write_practice_state(jsonb) to authenticated;\n`,
      "RECEIPT_APPEND_NON_SERVICE_GRANT",
    ],
    [
      `${source}\ngrant select on table public.c3r_p_practice_state to anon;\n`,
      "RECEIPT_APPEND_NON_SERVICE_GRANT",
    ],
    [
      source.replace("for all to service_role", "for all to authenticated"),
      "RECEIPT_APPEND_NON_SERVICE_POLICY",
    ],
    [
      source.replace("for all to service_role", "for all to service_role, anon"),
      "RECEIPT_APPEND_NON_SERVICE_POLICY",
    ],
    [
      source.replace(
        /revoke execute on function public\.transition_personal_concept_node_v1\([\s\S]*?\) from anon;\n/u,
        "",
      ),
      "RECEIPT_APPEND_FINAL_CONCEPT_BOUNDARY",
    ],
    [
      `${source}\ndrop policy c3r_p_practice_service_only on public.c3r_p_practice_state;\n`,
      "RECEIPT_APPEND_DESTRUCTIVE_OPERATION",
    ],
    [
      `${source}\nalter table public.personal_concept_nodes drop column metadata;\n`,
      "RECEIPT_APPEND_UNAUTHORIZED_ALTER",
    ],
    [
      `${source}\ndelete from public.personal_concept_nodes;\n`,
      "RECEIPT_APPEND_DESTRUCTIVE_OPERATION",
    ],
    [
      `${source}\ncreate function public.c3r_p_write_practice_state(value text) returns text language sql as $$ select value $$;\n`,
      "RECEIPT_APPEND_ROUTINE_OVERLOAD_FORBIDDEN",
    ],
    [
      `${source}\ncreate unlogged table public.evil (id integer);\n`,
      "RECEIPT_APPEND_UNLISTED_STATEMENT",
    ],
    [
      `${source}\ncreate table hostile_state (id integer);\n`,
      "RECEIPT_APPEND_UNLISTED_STATEMENT",
    ],
    [
      `${source}\ncreate function hostile() returns integer language sql as $$ select 1 $$;\n`,
      "RECEIPT_APPEND_CREATED_OBJECT_SCHEMA",
    ],
    [
      `${source}\ncreate table if not exists public.personal_concept_nodes (id uuid);\n`,
      "RECEIPT_APPEND_UNLISTED_STATEMENT",
    ],
    [
      `${source}\ncreate or replace function public.transition_personal_concept_node_v1(value text) returns text language sql as $$ select value $$;\n`,
      "RECEIPT_APPEND_UNLISTED_STATEMENT",
    ],
    [
      source.replace(
        "revoke all on function public.c3r_p_write_practice_state(jsonb) from public, anon, authenticated;\n",
        "",
      ),
      "RECEIPT_APPEND_ROUTINE_SOURCE_ACL",
    ],
    [
      source.replace(
        "public.c3r_p_write_practice_state(payload jsonb)",
        "public.c3r_p_write_practice_state(payload text)",
      ),
      "RECEIPT_APPEND_UNAUTHORIZED_PRIVILEGE_TARGET",
    ],
    [
      `${source}\ngrant execute on function public.c3r_p_write_practice_state(jsonb), public.preexisting_rpc() to service_role;\n`,
      "RECEIPT_APPEND_UNAUTHORIZED_PRIVILEGE_TARGET",
    ],
    [
      `${source}\ngrant select on table public.c3r_p_practice_state, public.preexisting_state to service_role;\n`,
      "RECEIPT_APPEND_UNAUTHORIZED_PRIVILEGE_TARGET",
    ],
    [
      `${source}\ncreate function public.c3r_p_practice_probe() returns integer language sql as $$ select count(*) from public.legal_sources $$;\n`,
      "RECEIPT_APPEND_CROSS_SUBJECT_BODY",
    ],
    [
      `${source}\ncreate function public.c3r_p_practice_dynamic_probe() returns integer language plpgsql as $$ begin execute 'select 1'; return 1; end $$;\n`,
      "RECEIPT_APPEND_DYNAMIC_SQL_BODY",
    ],
    [
      `${source}\ncreate function public.c3r_p_practice_string_probe() returns integer language sql as 'select count(*) from public.legal_sources';\n`,
      "RECEIPT_APPEND_ROUTINE_BODY_ENCODING",
    ],
    [
      `${source}\ncreate function public.c3r_p_practice_escape_probe() returns integer language sql as E'select count(*) from public.legal_sources';\n`,
      "RECEIPT_APPEND_ROUTINE_BODY_ENCODING",
    ],
    [
      `${source}\ncreate table public.c3r_p_practice_legal_link (id uuid references public.legal_sources(id));\n`,
      "RECEIPT_APPEND_CROSS_SUBJECT_SCOPE",
    ],
    [
      `${source}\ncreate table public.c3r_p_practice_subject_link (id uuid references public.law_state(id), theory_id uuid);\n`,
      "RECEIPT_APPEND_CROSS_SUBJECT_SCOPE",
    ],
  ]) {
    assert.throws(
      () => validateAppendSemanticSource(Buffer.from(mutant, "utf8"), contract),
      (error) => error.code === code,
      `${code} mutant must fail closed`,
    );
  }
});

test("receipt rejects a missing or reordered exact operation", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.existingPathOperations.reverse();
    },
    "RECEIPT_OPERATION_MISMATCH",
  );
});

test("receipt rejects source-derived dependency and nested-schema drift", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.dependencyAndOrderingClosure.sourceDerivedRecords.at(-1)
        .predecessors = [];
    },
    "RECEIPT_DEPENDENCY_CLOSURE",
  );
  await expectReceiptCode(
    (receipt) => {
      receipt.append.unknownPermission = true;
    },
    "RECEIPT_NESTED_FIELDS",
  );
});

test("receipt rejects unchanged-path content drift", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.unchangedPathClosure.records[0].evidence.byteCount += 1;
    },
    "RECEIPT_UNCHANGED_CLOSURE",
  );
});

test("receipt rejects a second append", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.effectiveInventory.secondAppendCount = 1;
    },
    "RECEIPT_EFFECTIVE_FORMULA",
  );
});

test("receipt rejects duplicate isolated reset identities", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.isolatedResetReplayReceipts[1].receiptId =
        receipt.isolatedResetReplayReceipts[0].receiptId;
    },
    "RECEIPT_RESET_ID_DUPLICATE",
  );
});

test("receipt rejects any PostgreSQL version other than 150008", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.isolatedResetReplayReceipts[0].serverVersionNum = 150009;
    },
    "RECEIPT_RESET_MISMATCH",
  );
});

test("receipt rejects final non-forced RLS", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.finalDatabaseState.relations[0].rlsForced = false;
    },
    "RECEIPT_FINAL_FORCE_RLS",
  );
});

test("receipt rejects unsafe final ACLs and an omitted transition catalog record", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.finalDatabaseState.routines[0].acl = [
        "authenticated=X/postgres",
      ];
    },
    "RECEIPT_FINAL_ROUTINE_NON_SERVICE_ACL",
  );
  await expectReceiptCode(
    (receipt) => {
      receipt.finalDatabaseState.policies[0].roles = ["authenticated"];
    },
    "RECEIPT_FINAL_RELATION_NON_SERVICE_POLICY",
  );
  await expectReceiptCode(
    (receipt) => {
      receipt.finalDatabaseState.routines.pop();
      recomputeFinalDatabaseState(receipt);
    },
    "RECEIPT_FINAL_TRANSITION_ROUTINE_MISSING",
  );
});

test("independent full-catalog evidence rejects a self-consistent omission", async () => {
  const receipt = await validReceipt();
  receipt.finalDatabaseState.relations =
    receipt.finalDatabaseState.relations.filter(
      (relation) => relation.identity !== "public.legacy_unforced_state",
    );
  recomputeFinalDatabaseState(receipt);
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(receipt, contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
      evidenceVerifier: trustedEvidenceVerifier,
    }),
    (error) => error.code === "RECEIPT_INDEPENDENT_EVIDENCE_MISMATCH",
  );
});

test("receipt rejects a later RLS weakening operation", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.finalDatabaseState.laterNoForceRlsOperationCount = 1;
    },
    "RECEIPT_LATER_RLS_WEAKENING",
  );
});

test("receipt rejects incomplete Practice issue evidence", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.practiceRuntimeReceipt.perSubjectIssueEvidence.pop();
    },
    "RECEIPT_PRACTICE_ISSUE_EVIDENCE",
  );
});

test("receipt rejects any remote contact or mutation", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.remoteContinuity.supabaseContactCount = 1;
    },
    "RECEIPT_REMOTE_MUTATION",
  );
});

test("receipt root digest covers the complete closed envelope", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.receiptDigest = "0".repeat(64);
    },
    "RECEIPT_DIGEST",
  );
});

test("receipt rejects broken artifact cross-links and verifier evidence", async () => {
  await expectReceiptCode(
    (receipt) => {
      receipt.metadataOnlyArtifactRefs[0].ref = "artifact://wrong-reset";
    },
    "RECEIPT_RESET_ARTIFACT_CROSS_BINDING",
  );
  await assert.rejects(
    validateC3rPMigrationMutationReceipt(await validReceipt(), contract, {
      repositoryRoot: futureFixture.fixtureRoot,
      authorityMergeReceiptVerifier: trustedAuthorityMergeReceiptVerifier,
      evidenceVerifier: async (context) => ({
        ...(await trustedEvidenceVerifier(context)),
        requiredNativeChecksPassed: false,
      }),
    }),
    (error) => error.code === "RECEIPT_INDEPENDENT_EVIDENCE_MISMATCH",
  );
});

test("authority mirrors preserve PRE-P as a non-stage without selector drift", async () => {
  const [agents, active, unifiedSource, unifiedMarkdown, roadmap, runner, prValidator, decision] =
    await Promise.all([
      readFile(path.join(repositoryRoot, "AGENTS.md"), "utf8"),
      readFile(path.join(repositoryRoot, "roadmap", "active-program.yml"), "utf8"),
      readFile(
        path.join(repositoryRoot, "config", "dabangil-unified-program-contract.json"),
        "utf8",
      ),
      readFile(
        path.join(repositoryRoot, "docs", "dabangil-unified-program-contract.md"),
        "utf8",
      ),
      readFile(path.join(repositoryRoot, "docs", "inverge-master-roadmap.md"), "utf8"),
      readFile(path.join(repositoryRoot, "scripts", "run-node-tests.mjs"), "utf8"),
      readFile(
        path.join(repositoryRoot, "scripts", "automation", "validate-pr-contract.mjs"),
        "utf8",
      ),
      readFile(decisionPath, "utf8"),
    ]);
  const unified = JSON.parse(unifiedSource);
  const frozenAppend = contract.frozenAppendAuthority.path;
  for (const source of [agents, active, unifiedMarkdown, roadmap]) {
    assert.match(source, /C3RPMigrationMutationAuthorityV1/u);
    assert.ok(source.includes(frozenAppend));
  }
  const top = unified.c3PrePMigrationMutationAuthorityDecision;
  const overlay = unified.wcvCampaignOverlay.c3PrePMigrationMutationAuthority;
  const campaign = unified.wcvCampaignOverlay.campaigns.find(
    (candidate) => candidate.id === "C3",
  );
  assert.equal(top.isC3rStage, false);
  assert.equal(top.stageSelectorChangeCount, 0);
  assert.equal(top.authorizedExistingPathOperationCount, 7);
  assert.equal(top.effectiveMigrationCount, 26);
  assert.equal(overlay.isC3rStage, false);
  assert.equal(overlay.frozenAppendPath, frozenAppend);
  assert.equal(
    overlay.authorityMergeReceiptType,
    "C3RPMigrationMutationAuthorityMergeReceiptV1",
  );
  assert.equal(overlay.authorityMergeReceiptPullRequest, 795);
  assert.equal(overlay.c3rPBaseMustEqualValidatedAuthorityResultingMain, true);
  assert.equal(overlay.remoteOperationAuthorizationCount, 0);
  const expectedMirroredOperations =
    contract.authorizedExistingPathOperations.records.map((operation) => {
      const base = {
        currentPath: operation.currentPath,
        futurePath: operation.futurePath,
        operation:
          operation.operationKind === "RENAME_ONLY"
            ? "RENAME_ONLY_BYTES_UNCHANGED"
            : operation.currentPath === operation.futurePath
              ? "EXACT_IN_PLACE_FRESH_HISTORY_COMPATIBILITY_REPAIR"
              : "RENAME_AND_EXACT_CONTENT_REPAIR",
        remoteClassification: operation.remoteClassification,
      };
      if (operation.operationKind === "RENAME_ONLY") {
        return { ...base, sha256: operation.currentEvidence.rawSha256 };
      }
      return {
        ...base,
        currentSha256: operation.currentEvidence.rawSha256,
        futureSha256: operation.futureEvidence.rawSha256,
      };
    });
  assert.deepEqual(overlay.authorizedOperations, expectedMirroredOperations);
  for (const operation of contract.authorizedExistingPathOperations.records) {
    assert.ok(decision.includes(operation.currentEvidence.gitBlob));
    assert.ok(decision.includes(operation.currentEvidence.rawSha256));
    if (operation.futureEvidence.rawSha256 !== operation.currentEvidence.rawSha256) {
      assert.ok(decision.includes(operation.futureEvidence.rawSha256));
    }
  }
  assert.equal(unified.roadmapContract.soleNextC3rStageId, "C3R-P");
  assert.equal(unified.roadmapContract.c3rSuccessorRuntimeStarted, false);
  assert.deepEqual(
    [top, overlay, campaign, unified.roadmapContract].map((value) =>
      sha256(Buffer.from(canonicalJson(value), "utf8")),
    ),
    [
      "aa8850fdafe31cdaee19ddd71e83221aaf344743f46ca5a05a5c6751be9c8b60",
      "f136ebbc933f7a02b9327f89ee80cb59baf8cb4fd7af898c0128996d653dd612",
      "5f68571348ae9046381b1c303f4f77b8ff2aa0d48666df27a9c7d9e03e517916",
      "d736b3cb5220cc47be081ff71f70c50fd38ce486e85c1edebe7363fbaf92681f",
    ],
  );
  assert.equal(
    runner.split("tests/wcv-c3-pre-p-migration-mutation-authority.test.mjs").length - 1,
    1,
  );
  assert.ok(
    prValidator.indexOf("isPreC3rPMigrationAuthorityCandidate(context)") <
      prValidator.indexOf("isPreC3rPOracleCandidate(context)"),
  );
});

function prBody() {
  return `## Goal
Install the source-only exact PRE-C3R-P migration-mutation authority.

Refs #706
Refs #707
Refs #708
Refs #714
Refs #781
- Issue disposition: #706/#707/#708/#714/#781 remain open; PRE-C3R-P authority closes none

## Non-goals
No migration mutation, runtime start, remote operation, Ready transition or merge.

## Risk classification
- Risk: [high]

## Data boundary
Metadata-only authority evidence.

## Schema / API / environment changes
None in this authority Draft.

## Tests and evidence
Focused and full non-container validation.

## Runtime evidence
Not applicable; source-only authority.

## Rollout and rollback
Keep Draft; revert the authority commit if rejected.

## Remaining risks
Later C3R-P and remote reconciliation remain separately gated.

## Merge recommendation
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

function prEvent(body = prBody(), draft = true) {
  return {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      base: {
        ref: "main",
        sha: "5965ddb0202c5f9effb531824d4d95f775abecc1",
      },
      body,
      draft,
      head: {
        ref: "codex/wcv-c3-pre-p-migration-mutation-authority",
        repo: { full_name: "chachathecat/inverge" },
      },
      title: "[WCV-C3 PRE-P] Authorize exact C3R-P migration reconciliation",
      auto_merge: null,
    },
  };
}

function runPrContract(event, cwd = repositoryRoot) {
  const eventPath = path.join(
    os.tmpdir(),
    `pre-c3r-p-migration-authority-pr-${randomUUID()}.json`,
  );
  fs.writeFileSync(eventPath, JSON.stringify(event), "utf8");
  try {
    return spawnSync(
      process.execPath,
      ["scripts/automation/validate-pr-contract.mjs"],
      {
        cwd,
        encoding: "utf8",
        env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
      },
    );
  } finally {
    fs.rmSync(eventPath, { force: true });
  }
}

test("PR reference-only exception requires the exact pinned Draft scope", () => {
  const passing = runPrContract(prEvent());
  assert.equal(passing.status, 0, passing.stderr);
  assert.match(passing.stdout, /pass/u);

  for (const candidate of [
    prEvent(`${prBody()}\nCloses #706\n`),
    prEvent(prBody().replace("Refs #708\n", "")),
    prEvent(prBody(), false),
    {
      ...prEvent(),
      pull_request: {
        ...prEvent().pull_request,
        title: "[WCV-C3 PRE-P] Wrong title",
      },
    },
    {
      ...prEvent(),
      pull_request: {
        ...prEvent().pull_request,
        head: {
          ...prEvent().pull_request.head,
          repo: { full_name: "hostile/fork" },
        },
      },
    },
  ]) {
    const result = runPrContract(candidate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reference-only/u);
  }

  const autoMergeEnabled = prEvent();
  autoMergeEnabled.pull_request.auto_merge = {
    enabled_by: { login: "hostile" },
    merge_method: "SQUASH",
  };
  const autoMergeResult = runPrContract(autoMergeEnabled);
  assert.notEqual(autoMergeResult.status, 0);
  assert.match(autoMergeResult.stderr, /auto_merge/u);
});

test("PR exception independently rejects machine-authority drift", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "pre-c3r-p-migration-pr-contract-"),
  );
  const validatorPath = path.join(
    fixtureRoot,
    "scripts",
    "automation",
    "validate-pr-contract.mjs",
  );
  const fixtureContractPath = path.join(
    fixtureRoot,
    "config",
    "dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
  );
  fs.mkdirSync(path.dirname(validatorPath), { recursive: true });
  fs.mkdirSync(path.dirname(fixtureContractPath), { recursive: true });
  fs.copyFileSync(
    path.join(repositoryRoot, "scripts", "automation", "validate-pr-contract.mjs"),
    validatorPath,
  );
  const mutant = clone(contract);
  mutant.deliveryControl.referenceOnlyIssueLinks.requiredReferenceLinesExactly.pop();
  fs.writeFileSync(fixtureContractPath, JSON.stringify(mutant), "utf8");
  try {
    const result = runPrContract(prEvent(), fixtureRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reference-only/u);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
