#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const AUTHORITY_SCHEMA_VERSION = "parallel_execution_v1.authority.v1";
export const LANE_PLAN_SCHEMA_VERSION = "parallel_execution_v1.lane_plan.v1";
export const GIT_EVIDENCE_SCHEMA_VERSION = "parallel_execution_v1.git_evidence.v1";

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const TREE_PATTERN = /^[0-9a-f]{40}$/u;
const GLOB_PATTERN = /[*?\[\]{}!]/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const EXPECTED_FROZEN_ARTIFACTS = [
  "config/dabangil-parallel-execution-v1.json",
  "docs/decisions/2026-08-25-owner-parallel-execution-v1.md",
  "scripts/automation/parallel-execution-v1.mjs",
];
const EXPECTED_KERNEL_PREFIXES = [
  "lib/review-os/first-stage/kernel/",
  "lib/review-os/first-stage/subject-adapter/",
];
const EXPECTED_INITIAL_LANES = [
  { laneId: "LANE_A_SECOND_STAGE", milestoneOrder: ["C3R-T", "C3R-L", "WCV-C3_FOUNDATION_FREEZE"] },
  { laneId: "LANE_B_FIRST_STAGE_KERNEL", milestoneOrder: ["FIRST_STAGE_COMMON_KERNEL", "STUDY_CAPACITY_RUNTIME_BRIDGE"] },
  { laneId: "LANE_C_QUESTION_FOUNDRY", milestoneOrder: ["QUESTION_FOUNDRY_V1"] },
];
const EXPECTED_SUBJECT_LANES = [
  "ACCOUNTING", "ECONOMICS", "CIVIL_LAW", "APPRAISAL_RELATED_LAWS",
  "REAL_ESTATE_PRINCIPLES", "GOLDEN_EVAL_META_AUDIT",
];
const EXPECTED_PROTECTED_CLASSES = [
  { classId: "MIGRATIONS", pathPrefixes: ["supabase/migrations/"], exactPaths: [], pathTokenPatterns: [] },
  {
    classId: "SHARED_AUTH_OR_RLS",
    pathPrefixes: ["app/(auth)/", "app/api/auth/", "lib/auth/", "lib/supabase/", "supabase/rls/"],
    exactPaths: ["middleware.ts", "proxy.ts"],
    pathTokenPatterns: ["(^|[/_.-])(auth|authenticated|login|sign-in|sign-up|rls|row-level|row_level)([/_.-]|$)"],
  },
  {
    classId: "PACKAGE_AND_LOCKFILES",
    pathPrefixes: [],
    exactPaths: ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"],
    pathTokenPatterns: [],
  },
  {
    classId: "COMMON_DURABLE_SUBSTRATE",
    pathPrefixes: ["app/api/review-os/c3r-p/", "app/app/c3r-p/"],
    exactPaths: [
      "components/review-os/c3r-p-practice-loop.tsx",
      "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json",
      "lib/review-os/c3r-p-contract.ts",
      "lib/review-os/c3r-p-engine.ts",
      "lib/review-os/c3r-p-repository.ts",
      "lib/review-os/c3r-p-service.ts",
      "scripts/automation/produce-runtime-evidence.mjs",
      "scripts/automation/runtime-gate.mjs",
      "scripts/automation/runtime-risk-contract.mjs",
      "scripts/automation/validate-pr-contract.mjs",
      "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
      "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql",
      "tests/agent-factory-contract-validation.test.mjs",
      "tests/agent-factory-runtime-gate.test.mjs",
      "tests/e2e/wcv-c3r-p-playwright.config.ts",
      "tests/e2e/wcv-c3r-p-practice-common-runtime.spec.ts",
      "tests/wcv-c3r-p-practice-common-durable-runtime.test.mjs",
    ],
    pathTokenPatterns: [],
  },
  {
    classId: "GLOBAL_AUTHORITY_PROGRAM_MIRRORS",
    pathPrefixes: ["docs/decisions/", "docs/exec-plans/active/"],
    exactPaths: [
      "AGENTS.md", "config/dabangil-unified-program-contract.json",
      "docs/dabangil-unified-program-contract.md", "roadmap/active-program.yml",
    ],
    pathTokenPatterns: [],
  },
  {
    classId: "SHARED_TEST_REGISTRATION",
    pathPrefixes: [".github/workflows/"],
    exactPaths: ["scripts/run-node-tests.mjs"],
    pathTokenPatterns: [],
  },
];

function result(errors) {
  return { valid: errors.length === 0, errors };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSha(value) {
  return typeof value === "string" && SHA_PATTERN.test(value);
}

function exactStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function arraysEqual(left, right) {
  return exactStringArray(left) && exactStringArray(right) &&
    left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function normalizedRepoPath(value) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return null;
  if (value.includes("\\") || value.startsWith("/") || value.endsWith("/") ||
      GLOB_PATTERN.test(value) || CONTROL_CHARACTER_PATTERN.test(value)) return null;
  if (/^[A-Za-z]:/u.test(value) || value.includes("//")) return null;
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return null;
  return value;
}

function normalizedWorktreePath(value) {
  const normalized = normalizedRepoPath(value);
  if (normalized === null || !normalized.startsWith(".agent-factory/worktrees/")) return null;
  return normalized;
}

function hasUniqueStrings(values) {
  return new Set(values.map((value) => value.toLowerCase())).size === values.length;
}

function matchesPathClass(path, pathClass) {
  const candidate = path.toLowerCase();
  return pathClass.exactPaths.some((exactPath) => exactPath.toLowerCase() === candidate) ||
    pathClass.pathPrefixes.some((prefix) => candidate.startsWith(prefix.toLowerCase())) ||
    pathClass.pathTokenPatterns.some((pattern) => new RegExp(pattern, "iu").test(path));
}

function matchesKernelBoundary(path, contract) {
  const candidate = path.toLowerCase();
  return contract.commonKernelBoundary.pathPrefixes.some((prefix) => candidate.startsWith(prefix.toLowerCase()));
}

function validateReceipt(receipt, label, errors) {
  if (!isRecord(receipt)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (!Number.isInteger(receipt.pullRequest) || receipt.pullRequest <= 0) errors.push(`${label}.pullRequest must be a positive integer.`);
  for (const field of ["reviewedHeadSha", "resultingMainSha", "resultingMainTree"]) {
    if (!isSha(receipt[field])) errors.push(`${label}.${field} must be a lowercase 40-character Git identity.`);
  }
  if (receipt.validated !== true) errors.push(`${label}.validated must be true.`);
}

function validateExactHeadMergeReceipt(receipt, label, errors) {
  validateReceipt(receipt, label, errors);
  if (!isRecord(receipt) || receipt.receiptVersion !== "parallel_execution_v1.merge_receipt.v1" ||
      receipt.amendmentId !== "PARALLEL_EXECUTION_V1" || receipt.source !== "live_github_validated" ||
      !isSha(receipt.reviewedHeadTree) ||
      receipt.expectedHeadPinned !== true || receipt.squashMerge !== true ||
      receipt.requiredChecksPassed !== true || receipt.unresolvedActionableThreads !== 0 ||
      !isRecord(receipt.actionableReviewCounts) || receipt.actionableReviewCounts.p0 !== 0 ||
      receipt.actionableReviewCounts.p1 !== 0 || receipt.actionableReviewCounts.p2 !== 0) {
    errors.push(`${label} must be a complete live-GitHub-validated exact-head merge receipt.`);
  }
}

function validateAuthorityReceipt(receipt, errors) {
  validateExactHeadMergeReceipt(receipt, "authorityReceipt", errors);
}

export function validateParallelExecutionAuthority(contract) {
  const errors = [];
  if (!isRecord(contract)) return result(["authority must be an object."]);
  if (contract.schemaVersion !== AUTHORITY_SCHEMA_VERSION) errors.push("authority schemaVersion is invalid.");
  if (contract.amendmentId !== "PARALLEL_EXECUTION_V1") errors.push("amendmentId must be PARALLEL_EXECUTION_V1.");
  if (contract.programId !== "INVERGE_OWNER_STUDY_OS") errors.push("programId is invalid.");
  if (contract.authorityDecisionPath !== "docs/decisions/2026-08-25-owner-parallel-execution-v1.md") errors.push("authorityDecisionPath is invalid.");
  if (contract.authorityStatus !== "effective_only_after_expected_head_pinned_squash_merge_and_validated_github_receipt") errors.push("authorityStatus must remain merge-receipt gated.");

  const prerequisite = contract.validatedPrerequisite;
  if (!isRecord(prerequisite) || prerequisite.pullRequest !== 807 ||
      prerequisite.reviewedHeadSha !== "eae0cfc27d6c44f244cd368882fdbdeae7282a0c" ||
      prerequisite.resultingMainSha !== "c269d8fa489dc1ac77ef77d203dadffc0e4e73e5" ||
      prerequisite.resultingMainTree !== "90c725a3f82665d8533a20254f1088de86fef18c" ||
      prerequisite.contributionPresentAndUnreverted !== true) {
    errors.push("validatedPrerequisite must bind the exact unreverted PR #807 receipt.");
  }

  const limits = contract.limits;
  if (!isRecord(limits) || limits.initialMergeProducingLaneCount !== 3 ||
      limits.subjectAdapterEvalLaneCountAfterKernelFreeze !== 6 || Object.keys(limits).length !== 2) {
    errors.push("lane limits must be exactly initial=3 and post-freeze subject/eval=6.");
  }

  const initialIds = Array.isArray(contract.initialLanes)
    ? contract.initialLanes.map((lane) => lane?.laneId)
    : [];
  if (!arraysEqual(initialIds, EXPECTED_INITIAL_LANES.map((lane) => lane.laneId)) ||
      !EXPECTED_INITIAL_LANES.every((expected, index) => arraysEqual(contract.initialLanes?.[index]?.milestoneOrder, expected.milestoneOrder))) {
    errors.push("initialLanes must contain the exact three ordered lane identities.");
  }
  if (!arraysEqual(contract.declaredIntegrationAndMergeOrder, [
    "LANE_A_SECOND_STAGE:C3R-T",
    "LANE_A_SECOND_STAGE:C3R-L",
    "LANE_A_SECOND_STAGE:WCV-C3_FOUNDATION_FREEZE",
    "LANE_B_FIRST_STAGE_KERNEL:FIRST_STAGE_COMMON_KERNEL",
    "LANE_B_FIRST_STAGE_KERNEL:STUDY_CAPACITY_RUNTIME_BRIDGE",
    "LANE_C_QUESTION_FOUNDRY:QUESTION_FOUNDRY_V1",
    ...EXPECTED_SUBJECT_LANES,
  ])) errors.push("declaredIntegrationAndMergeOrder is invalid.");
  if (!arraysEqual(contract.subjectAdapterEvalLanes, EXPECTED_SUBJECT_LANES)) errors.push("subjectAdapterEvalLanes is invalid.");

  const gate = contract.subjectLaneStartGate;
  if (!isRecord(gate) || gate.requiredMergedMilestone !== "FIRST_STAGE_COMMON_KERNEL" ||
      gate.requiredFrozenInterface !== "SubjectAdapter" || gate.validatedResultingMainReceiptRequired !== true) {
    errors.push("subjectLaneStartGate must require the merged frozen Kernel and SubjectAdapter receipt.");
  }

  const worktree = contract.worktreePolicy;
  if (!isRecord(worktree) || Object.values(worktree).some((value) => value !== true)) {
    errors.push("every worktree policy guard must remain true.");
  }
  const ownership = contract.ownershipPolicy;
  if (!isRecord(ownership) || ownership.exactRepoRelativeOwnedPathsRequired !== true ||
      ownership.globOwnershipProhibited !== true || ownership.trustedGitDiffEvidenceRequired !== true ||
      ownership.cleanWorktreeRequiredAtCandidate !== true || ownership.baseAncestorAndExactMergeBaseRequired !== true ||
      ownership.everyChangedPathMustBeOwnedByExactlyOneLane !== true ||
      ownership.overlappingOwnedOrChangedPathDisposition !== "fail_closed" ||
      ownership.undeclaredChangedPathDisposition !== "fail_closed") {
    errors.push("ownership policy must remain exact and fail closed.");
  }
  if (!arraysEqual(contract.frozenAmendmentArtifacts, EXPECTED_FROZEN_ARTIFACTS)) {
    errors.push("frozenAmendmentArtifacts must remain exact.");
  }

  const classes = contract.protectedConcurrentMutationClasses;
  if (!Array.isArray(classes) || classes.length !== EXPECTED_PROTECTED_CLASSES.length ||
      !EXPECTED_PROTECTED_CLASSES.every((expected, index) => {
        const actual = classes[index];
        return actual?.classId === expected.classId && arraysEqual(actual.pathPrefixes, expected.pathPrefixes) &&
          arraysEqual(actual.exactPaths, expected.exactPaths) &&
          arraysEqual(actual.pathTokenPatterns, expected.pathTokenPatterns) && actual.maximumConcurrentOwningLanes === 1;
      })) {
    errors.push("protectedConcurrentMutationClasses must contain the exact protected classes.");
  } else {
    for (const entry of classes) {
      if (!exactStringArray(entry.pathPrefixes) || !exactStringArray(entry.exactPaths) ||
          !exactStringArray(entry.pathTokenPatterns) ||
          entry.maximumConcurrentOwningLanes !== 1) {
        errors.push(`${entry.classId} must be a closed path set with one maximum concurrent owner.`);
      }
    }
  }

  const kernel = contract.commonKernelBoundary;
  if (!isRecord(kernel) || !arraysEqual(kernel.pathPrefixes, EXPECTED_KERNEL_PREFIXES) ||
      kernel.subjectLaneMutationRequiresOneIntegrationGate !== true) {
    errors.push("commonKernelBoundary must require one subject-lane integration gate.");
  }
  const activation = contract.activationBoundary;
  if (!isRecord(activation) || activation.ownerOnly !== true || activation.defaultOff !== true ||
      ["publicActivation", "paymentActivation", "externalLearnerActivation", "remoteSupabaseMutation", "productionMutation"]
        .some((field) => activation[field] !== false)) {
    errors.push("activation boundary must remain Owner-only, default-off, local-only and non-Production.");
  }
  return result(errors);
}

function validateLane(lane, contract, sharedBase, completed, errors) {
  if (!isRecord(lane)) {
    errors.push("each lane must be an object.");
    return;
  }
  const initialIds = contract.initialLanes.map((entry) => entry.laneId);
  const subjectIds = contract.subjectAdapterEvalLanes;
  if (lane.phase === "initial") {
    if (!initialIds.includes(lane.laneId)) errors.push(`${lane.laneId ?? "lane"} is not an authorized initial lane.`);
  } else if (lane.phase === "subject_adapter_eval") {
    if (!subjectIds.includes(lane.laneId)) errors.push(`${lane.laneId ?? "lane"} is not an authorized subject/eval lane.`);
  } else errors.push(`${lane.laneId ?? "lane"}.phase is invalid.`);
  if (lane.mergeProducing !== true) errors.push(`${lane.laneId ?? "lane"}.mergeProducing must be true.`);
  if (!isSha(lane.headSha)) errors.push(`${lane.laneId ?? "lane"}.headSha must be exact.`);
  if (normalizedWorktreePath(lane.worktreePath) === null) errors.push(`${lane.laneId ?? "lane"}.worktreePath must be one exact isolated repo-relative worktree path.`);
  if (typeof lane.branch !== "string" || !lane.branch.startsWith("codex/") || lane.branch.length <= "codex/".length) errors.push(`${lane.laneId ?? "lane"}.branch must use the codex/ prefix.`);
  if (lane.baseMainSha !== sharedBase.mainSha || lane.baseMainTree !== sharedBase.mainTree) errors.push(`${lane.laneId ?? "lane"} is not based on the declared shared main.`);
  for (const field of ["ownedPaths", "changedPaths"]) {
    if (!exactStringArray(lane[field]) || lane[field].some((path) => normalizedRepoPath(path) === null) || !hasUniqueStrings(lane[field] ?? [])) {
      errors.push(`${lane.laneId ?? "lane"}.${field} must be unique exact repo-relative file paths without globs.`);
    }
  }
  if (exactStringArray(lane.ownedPaths) && exactStringArray(lane.changedPaths)) {
    const owned = new Set(lane.ownedPaths.map((path) => path.toLowerCase()));
    for (const path of lane.changedPaths) if (!owned.has(path.toLowerCase())) errors.push(`${lane.laneId}.${path} changed without exact ownership.`);
  }
  const allowedDeliverables = lane.laneId === "LANE_A_SECOND_STAGE" ? ["C3R-T", "C3R-L", "WCV-C3_FOUNDATION_FREEZE"]
    : lane.laneId === "LANE_B_FIRST_STAGE_KERNEL" ? ["FIRST_STAGE_COMMON_KERNEL", "STUDY_CAPACITY_RUNTIME_BRIDGE"]
      : lane.laneId === "LANE_C_QUESTION_FOUNDRY" ? ["QUESTION_FOUNDRY_V1"]
        : subjectIds.includes(lane.laneId) ? [lane.laneId] : [];
  if (!allowedDeliverables.includes(lane.deliverable)) errors.push(`${lane.laneId ?? "lane"}.deliverable is invalid.`);
  const milestoneIndex = allowedDeliverables.indexOf(lane.deliverable);
  if (lane.phase === "initial" && milestoneIndex > 0) {
    const prerequisite = allowedDeliverables[milestoneIndex - 1];
    const prerequisiteDeliverable = `${lane.laneId}:${prerequisite}`;
    if (!completed.some((entry) => entry?.deliverable === prerequisiteDeliverable && entry.validated === true)) {
      errors.push(`${lane.laneId} cannot open ${lane.deliverable} before the validated ${prerequisite} integration receipt.`);
    }
  }
}

function validateGitEvidence(plan, contract, observedEvidence, errors) {
  if (!isRecord(observedEvidence) || observedEvidence.schemaVersion !== GIT_EVIDENCE_SCHEMA_VERSION ||
      observedEvidence.baseMainSha !== plan.sharedBase?.mainSha ||
      observedEvidence.derivedBaseMainTree !== plan.sharedBase?.mainTree ||
      observedEvidence.authorityResultingMainSha !== plan.authorityReceipt?.resultingMainSha ||
      observedEvidence.derivedAuthorityResultingMainTree !== plan.authorityReceipt?.resultingMainTree ||
      observedEvidence.reviewedHeadSha !== plan.authorityReceipt?.reviewedHeadSha ||
      observedEvidence.derivedReviewedHeadTree !== plan.authorityReceipt?.reviewedHeadTree ||
      observedEvidence.derivedAuthorityResultingMainTree !== observedEvidence.derivedReviewedHeadTree ||
      observedEvidence.authorityBaseIsAncestorOfSharedBase !== true ||
      !Array.isArray(observedEvidence.completedIntegrationReceipts) ||
      !Array.isArray(observedEvidence.lanes)) {
    errors.push("trusted Git evidence is missing or does not bind the derived authority/shared-base identities.");
    return;
  }
  const completed = plan.completedIntegrationReceipts ?? [];
  if (observedEvidence.completedIntegrationReceipts.length !== completed.length) {
    errors.push("trusted Git evidence must contain every completed integration receipt exactly once.");
  }
  for (let index = 0; index < completed.length; index += 1) {
    const receipt = completed[index];
    const evidence = observedEvidence.completedIntegrationReceipts[index];
    const previousResultingMainSha = index === 0
      ? plan.authorityReceipt?.resultingMainSha
      : completed[index - 1]?.resultingMainSha;
    if (!isRecord(evidence) || evidence.deliverable !== receipt?.deliverable ||
        evidence.previousResultingMainSha !== previousResultingMainSha ||
        evidence.reviewedHeadSha !== receipt?.reviewedHeadSha ||
        evidence.derivedReviewedHeadTree !== receipt?.reviewedHeadTree ||
        evidence.resultingMainSha !== receipt?.resultingMainSha ||
        evidence.derivedResultingMainTree !== receipt?.resultingMainTree ||
        evidence.derivedResultingMainTree !== evidence.derivedReviewedHeadTree ||
        evidence.reviewedHeadMergeBaseSha !== previousResultingMainSha ||
        evidence.resultParentSha !== previousResultingMainSha || evidence.resultParentCount !== 1 ||
        evidence.previousResultIsAncestorOfReviewedHead !== true ||
        evidence.previousResultIsAncestorOfResultingMain !== true ||
        !Array.isArray(evidence.frozenArtifacts)) {
      errors.push(`completedIntegrationReceipts[${index}] lacks an exact Git-object squash chain from the prior result.`);
      continue;
    }
    if (evidence.frozenArtifacts.length !== contract.frozenAmendmentArtifacts.length ||
        !evidence.frozenArtifacts.every((artifact, artifactIndex) =>
          artifact?.path === contract.frozenAmendmentArtifacts[artifactIndex] && isSha(artifact.authorityBlobSha1) &&
          artifact.authorityBlobSha1 === artifact.reviewedHeadBlobSha1 &&
          artifact.authorityBlobSha1 === artifact.resultingMainBlobSha1)) {
      errors.push(`completedIntegrationReceipts[${index}] does not preserve every amendment artifact byte-identically.`);
    }
  }
  const evidenceByLane = new Map(observedEvidence.lanes.map((entry) => [entry?.laneId, entry]));
  if (evidenceByLane.size !== plan.lanes.length || observedEvidence.lanes.length !== plan.lanes.length) {
    errors.push("trusted Git evidence must contain every lane exactly once.");
  }
  for (const lane of plan.lanes) {
    const evidence = evidenceByLane.get(lane?.laneId);
    if (!isRecord(evidence)) {
      errors.push(`${lane?.laneId ?? "lane"} has no trusted Git evidence.`);
      continue;
    }
    if (evidence.worktreePath !== lane.worktreePath || evidence.branch !== lane.branch ||
        evidence.headSha !== lane.headSha || evidence.mergeBaseSha !== plan.sharedBase.mainSha ||
        evidence.baseIsAncestor !== true || evidence.cleanWorktree !== true || !Array.isArray(evidence.entries) ||
        !Array.isArray(evidence.frozenArtifacts)) {
      errors.push(`${lane.laneId} Git identity, ancestry, branch or clean-worktree evidence is invalid.`);
      continue;
    }
    if (evidence.frozenArtifacts.length !== contract.frozenAmendmentArtifacts.length ||
        !evidence.frozenArtifacts.every((artifact, index) =>
          artifact?.path === contract.frozenAmendmentArtifacts[index] && isSha(artifact.authorityBlobSha1) &&
          artifact.authorityBlobSha1 === artifact.reviewedHeadBlobSha1 &&
          artifact.authorityBlobSha1 === artifact.sharedBaseBlobSha1 &&
          artifact.authorityBlobSha1 === artifact.headBlobSha1)) {
      errors.push(`${lane.laneId} does not preserve every merged amendment artifact byte-identically.`);
    }
    const observedPaths = [];
    for (const entry of evidence.entries) {
      if (!isRecord(entry) || normalizedRepoPath(entry.path) === null ||
          !["added", "modified"].includes(entry.changeKind) ||
          !["100644", "100755"].includes(entry.gitMode) || !isSha(entry.headBlobSha1) ||
          !SHA256_PATTERN.test(entry.contentSha256 ?? "") ||
          (entry.changeKind === "added" ? entry.baseBlobSha1 !== null : !isSha(entry.baseBlobSha1))) {
        errors.push(`${lane.laneId} has an invalid Git diff entry.`);
        continue;
      }
      observedPaths.push(entry.path);
      if (contract.frozenAmendmentArtifacts.some((frozenPath) => frozenPath.toLowerCase() === entry.path.toLowerCase())) {
        errors.push(`${lane.laneId} changes frozen amendment artifact ${entry.path}.`);
      }
    }
    if (!hasUniqueStrings(observedPaths) ||
        !arraysEqual([...observedPaths].sort(), [...(lane.changedPaths ?? [])].sort())) {
      errors.push(`${lane.laneId} declared changed paths do not exactly equal the trusted Git diff.`);
    }
  }
}

function validateIntegrationState(plan, contract, errors) {
  const completed = plan.completedIntegrationReceipts;
  if (!Array.isArray(completed)) {
    errors.push("completedIntegrationReceipts must be an array.");
    return [];
  }
  const declared = contract.declaredIntegrationAndMergeOrder;
  if (completed.length > declared.length ||
      !completed.every((entry, index) => entry?.deliverable === declared[index])) {
    errors.push("completed integration receipts must be an exact prefix of the declared merge order.");
  }
  completed.forEach((entry, index) => validateExactHeadMergeReceipt(entry, `completedIntegrationReceipts[${index}]`, errors));
  const expectedCandidate = completed.length < declared.length ? declared[completed.length] : null;
  if (plan.mergeCandidate !== expectedCandidate) errors.push("mergeCandidate is not the next declared integration outcome.");
  if (expectedCandidate !== null && Array.isArray(plan.lanes)) {
    const candidateIsActive = plan.lanes.some((lane) =>
      (lane.phase === "initial" ? `${lane.laneId}:${lane.deliverable}` : lane.deliverable) === expectedCandidate);
    if (!candidateIsActive) errors.push("the next declared merge candidate has no active lane.");
  }
  return completed;
}

export function validateParallelExecutionPlan(plan, contract, observedEvidence) {
  const authorityValidation = validateParallelExecutionAuthority(contract);
  const errors = [...authorityValidation.errors];
  if (!authorityValidation.valid) return result([...errors, "lane plan cannot be validated against an invalid authority."]);
  if (!isRecord(plan)) return result([...errors, "lane plan must be an object."]);
  if (plan.schemaVersion !== LANE_PLAN_SCHEMA_VERSION) errors.push("lane plan schemaVersion is invalid.");
  if (plan.amendmentId !== contract.amendmentId) errors.push("lane plan amendmentId is invalid.");
  if (!arraysEqual(plan.declaredIntegrationAndMergeOrder, contract.declaredIntegrationAndMergeOrder)) errors.push("integration and merge order drifted.");
  validateAuthorityReceipt(plan.authorityReceipt, errors);
  const completed = validateIntegrationState(plan, contract, errors);

  const sharedBase = plan.sharedBase;
  if (!isRecord(sharedBase) || !isSha(sharedBase.mainSha) || !TREE_PATTERN.test(sharedBase.mainTree ?? "")) {
    errors.push("sharedBase must contain exact main SHA and tree identities.");
  }
  const latestBaseReceipt = completed.length > 0 ? completed.at(-1) : plan.authorityReceipt;
  if (isRecord(latestBaseReceipt) && isRecord(sharedBase) &&
      (sharedBase.mainSha !== latestBaseReceipt.resultingMainSha || sharedBase.mainTree !== latestBaseReceipt.resultingMainTree)) {
    errors.push("sharedBase must be the latest validated integration resulting-main receipt.");
  }

  const lanes = plan.lanes;
  if (!Array.isArray(lanes)) return result([...errors, "lanes must be an array."]);
  for (const lane of lanes) validateLane(lane, contract, sharedBase ?? {}, completed, errors);
  validateGitEvidence(plan, contract, observedEvidence, errors);
  const initial = lanes.filter((lane) => lane?.phase === "initial");
  const subjects = lanes.filter((lane) => lane?.phase === "subject_adapter_eval");
  if (initial.length > contract.limits.initialMergeProducingLaneCount) errors.push("initial merge-producing lane limit exceeded.");
  if (subjects.length > contract.limits.subjectAdapterEvalLaneCountAfterKernelFreeze) errors.push("subject/eval lane limit exceeded.");

  const laneIds = lanes.map((lane) => lane?.laneId).filter((value) => typeof value === "string");
  const worktrees = lanes.map((lane) => lane?.worktreePath).filter((value) => typeof value === "string");
  const branches = lanes.map((lane) => lane?.branch).filter((value) => typeof value === "string");
  if (!hasUniqueStrings(laneIds)) errors.push("lane identities must be unique.");
  if (!hasUniqueStrings(worktrees)) errors.push("each lane must use a unique isolated worktree.");
  if (!hasUniqueStrings(branches)) errors.push("each lane must use a unique branch.");

  const ownedByPath = new Map();
  const changedByPath = new Map();
  for (const lane of lanes) {
    if (!exactStringArray(lane?.ownedPaths) || !exactStringArray(lane?.changedPaths)) continue;
    for (const path of lane.ownedPaths) {
      const key = path.toLowerCase();
      const owners = ownedByPath.get(key) ?? [];
      owners.push(lane.laneId);
      ownedByPath.set(key, owners);
    }
    for (const path of lane.changedPaths) {
      const key = path.toLowerCase();
      const changers = changedByPath.get(key) ?? [];
      changers.push(lane.laneId);
      changedByPath.set(key, changers);
    }
  }
  for (const [path, owners] of ownedByPath) if (new Set(owners).size !== 1) errors.push(`${path} has overlapping lane ownership.`);
  for (const [path, changers] of changedByPath) if (new Set(changers).size !== 1) errors.push(`${path} is changed by multiple lanes.`);

  for (const pathClass of contract.protectedConcurrentMutationClasses) {
    const owners = new Set();
    for (const lane of lanes) {
      const paths = [...(lane?.ownedPaths ?? []), ...(lane?.changedPaths ?? [])];
      if (paths.some((path) => typeof path === "string" && matchesPathClass(path, pathClass))) owners.add(lane.laneId);
    }
    if (owners.size > pathClass.maximumConcurrentOwningLanes) errors.push(`${pathClass.classId} has concurrent mutation ownership by ${[...owners].join(", ")}.`);
  }

  if (subjects.length > 0) {
    const freeze = plan.kernelFreezeReceipt;
    validateReceipt(freeze, "kernelFreezeReceipt", errors);
    const kernelDeliverable = "LANE_B_FIRST_STAGE_KERNEL:FIRST_STAGE_COMMON_KERNEL";
    const kernelReceipt = completed.find((entry) => entry?.deliverable === kernelDeliverable);
    if (!isRecord(freeze) || freeze.milestone !== contract.subjectLaneStartGate.requiredMergedMilestone ||
        freeze.frozenInterface !== contract.subjectLaneStartGate.requiredFrozenInterface || freeze.frozen !== true ||
        !isRecord(kernelReceipt) || ["pullRequest", "reviewedHeadSha", "resultingMainSha", "resultingMainTree"]
          .some((field) => freeze[field] !== kernelReceipt[field])) {
      errors.push("subject/eval lanes require a validated merged and frozen Kernel/SubjectAdapter receipt.");
    }
  }

  const kernelMutators = subjects.filter((lane) => [...(lane.ownedPaths ?? []), ...(lane.changedPaths ?? [])]
    .some((path) => matchesKernelBoundary(path, contract)));
  if (kernelMutators.length > 0) {
    const gate = plan.kernelIntegrationGate;
    const kernelPaths = [...new Set(kernelMutators.flatMap((lane) => [...lane.ownedPaths, ...lane.changedPaths])
      .filter((path) => matchesKernelBoundary(path, contract)))].sort();
    if (kernelMutators.length !== 1 || !isRecord(gate) || gate.approved !== true ||
        gate.laneId !== kernelMutators[0]?.laneId || !arraysEqual(gate.paths, kernelPaths) ||
        gate.kernelFreezeResultingMainSha !== plan.kernelFreezeReceipt?.resultingMainSha) {
      errors.push("subject-lane common Kernel mutation requires one exact integration gate for one lane and exact paths.");
    }
  }

  const activation = plan.activationBoundary;
  if (JSON.stringify(activation) !== JSON.stringify(contract.activationBoundary)) errors.push("lane plan activation boundary drifted from the authority.");
  return result(errors);
}

function git(args, cwd, encoding = "utf8") {
  const execution = spawnSync("git", args, { cwd, encoding });
  if (execution.status !== 0) {
    const stderr = Buffer.isBuffer(execution.stderr) ? execution.stderr.toString("utf8") : execution.stderr;
    throw new Error(`git ${args[0]} failed in ${cwd}: ${stderr || "unknown Git failure"}`);
  }
  return execution.stdout;
}

function treeEntry(cwd, commit, repoPath) {
  const output = git(["ls-tree", "-z", commit, "--", repoPath], cwd);
  if (output.length === 0) return null;
  const tabIndex = output.indexOf("\t");
  const metadata = output.slice(0, tabIndex).split(" ");
  return { mode: metadata[0], type: metadata[1], object: metadata[2] };
}

export function collectParallelExecutionGitEvidence(plan, repositoryRoot) {
  if (!isRecord(plan) || !isRecord(plan.sharedBase) || !Array.isArray(plan.lanes)) {
    throw new Error("cannot collect Git evidence for a malformed lane plan");
  }
  const resolvedRoot = path.resolve(repositoryRoot);
  const authoritySha = plan.authorityReceipt?.resultingMainSha;
  const reviewedHeadSha = plan.authorityReceipt?.reviewedHeadSha;
  if (!isSha(authoritySha) || !isSha(reviewedHeadSha) || !isSha(plan.sharedBase.mainSha)) {
    throw new Error("reviewed-head, authority and shared-base SHAs are required");
  }
  const derivedAuthorityResultingMainTree = git(["rev-parse", `${authoritySha}^{tree}`], resolvedRoot).trim();
  const derivedReviewedHeadTree = git(["rev-parse", `${reviewedHeadSha}^{tree}`], resolvedRoot).trim();
  const derivedBaseMainTree = git(["rev-parse", `${plan.sharedBase.mainSha}^{tree}`], resolvedRoot).trim();
  const authorityAncestor = spawnSync("git", ["merge-base", "--is-ancestor", authoritySha, plan.sharedBase.mainSha], {
    cwd: resolvedRoot,
    encoding: "utf8",
  });
  if (![0, 1].includes(authorityAncestor.status)) throw new Error("authority-to-shared-base ancestry check failed");
  const completedIntegrationReceipts = (plan.completedIntegrationReceipts ?? []).map((receipt, index) => {
    const previousResultingMainSha = index === 0
      ? authoritySha
      : plan.completedIntegrationReceipts[index - 1]?.resultingMainSha;
    if (!isSha(previousResultingMainSha) || !isSha(receipt?.reviewedHeadSha) || !isSha(receipt?.resultingMainSha)) {
      throw new Error(`completed integration receipt ${index} has invalid Git identities`);
    }
    const derivedReviewedHeadTree = git(["rev-parse", `${receipt.reviewedHeadSha}^{tree}`], resolvedRoot).trim();
    const derivedResultingMainTree = git(["rev-parse", `${receipt.resultingMainSha}^{tree}`], resolvedRoot).trim();
    const parentTokens = git(["rev-list", "--parents", "-n", "1", receipt.resultingMainSha], resolvedRoot)
      .trim().split(/\s+/u);
    const resultParents = parentTokens.slice(1);
    const reviewedHeadMergeBaseSha = git(["merge-base", previousResultingMainSha, receipt.reviewedHeadSha], resolvedRoot).trim();
    const reviewedAncestor = spawnSync("git", ["merge-base", "--is-ancestor", previousResultingMainSha, receipt.reviewedHeadSha], {
      cwd: resolvedRoot,
      encoding: "utf8",
    });
    const resultAncestor = spawnSync("git", ["merge-base", "--is-ancestor", previousResultingMainSha, receipt.resultingMainSha], {
      cwd: resolvedRoot,
      encoding: "utf8",
    });
    if (![0, 1].includes(reviewedAncestor.status) || ![0, 1].includes(resultAncestor.status)) {
      throw new Error(`completed integration receipt ${index} ancestry check failed`);
    }
    const frozenArtifacts = EXPECTED_FROZEN_ARTIFACTS.map((repoPath) => {
      const authority = treeEntry(resolvedRoot, authoritySha, repoPath);
      const reviewedHead = treeEntry(resolvedRoot, receipt.reviewedHeadSha, repoPath);
      const resultingMain = treeEntry(resolvedRoot, receipt.resultingMainSha, repoPath);
      return {
        path: repoPath,
        authorityBlobSha1: authority?.type === "blob" ? authority.object : null,
        reviewedHeadBlobSha1: reviewedHead?.type === "blob" ? reviewedHead.object : null,
        resultingMainBlobSha1: resultingMain?.type === "blob" ? resultingMain.object : null,
      };
    });
    return {
      deliverable: receipt.deliverable,
      previousResultingMainSha,
      reviewedHeadSha: receipt.reviewedHeadSha,
      derivedReviewedHeadTree,
      resultingMainSha: receipt.resultingMainSha,
      derivedResultingMainTree,
      reviewedHeadMergeBaseSha,
      resultParentSha: resultParents[0] ?? null,
      resultParentCount: resultParents.length,
      previousResultIsAncestorOfReviewedHead: reviewedAncestor.status === 0,
      previousResultIsAncestorOfResultingMain: resultAncestor.status === 0,
      frozenArtifacts,
    };
  });
  const laneEvidence = plan.lanes.map((lane) => {
    if (normalizedWorktreePath(lane?.worktreePath) === null) throw new Error("lane worktree path is invalid");
    const worktree = path.resolve(resolvedRoot, lane.worktreePath);
    if (!worktree.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("lane worktree escapes repository root");
    const headSha = git(["rev-parse", "HEAD"], worktree).trim();
    const branch = git(["branch", "--show-current"], worktree).trim();
    const mergeBaseSha = git(["merge-base", plan.sharedBase.mainSha, headSha], worktree).trim();
    const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", plan.sharedBase.mainSha, headSha], {
      cwd: worktree,
      encoding: "utf8",
    });
    if (![0, 1].includes(ancestor.status)) throw new Error(`Git ancestry check failed in ${worktree}.`);
    const cleanWorktree = git(["status", "--porcelain=v1"], worktree).length === 0;
    const tokens = git(["diff", "--name-status", "--no-renames", "-z", plan.sharedBase.mainSha, headSha], worktree)
      .split("\0").filter((entry) => entry.length > 0);
    const entries = [];
    for (let index = 0; index < tokens.length; index += 2) {
      const status = tokens[index];
      const repoPath = tokens[index + 1];
      if (repoPath === undefined) throw new Error(`Git diff emitted an incomplete entry in ${worktree}.`);
      const head = treeEntry(worktree, headSha, repoPath);
      const base = treeEntry(worktree, plan.sharedBase.mainSha, repoPath);
      const content = head === null ? Buffer.alloc(0) : git(["show", `${headSha}:${repoPath}`], worktree, null);
      entries.push({
        path: repoPath,
        changeKind: status === "A" ? "added" : status === "M" ? "modified" : status.toLowerCase(),
        gitMode: head?.mode ?? null,
        headBlobSha1: head?.type === "blob" ? head.object : null,
        baseBlobSha1: base?.type === "blob" ? base.object : null,
        contentSha256: createHash("sha256").update(content).digest("hex"),
      });
    }
    const frozenArtifacts = EXPECTED_FROZEN_ARTIFACTS.map((repoPath) => {
      const authority = treeEntry(worktree, authoritySha, repoPath);
      const reviewedHead = treeEntry(worktree, reviewedHeadSha, repoPath);
      const sharedBase = treeEntry(worktree, plan.sharedBase.mainSha, repoPath);
      const head = treeEntry(worktree, headSha, repoPath);
      return {
        path: repoPath,
        authorityBlobSha1: authority?.type === "blob" ? authority.object : null,
        reviewedHeadBlobSha1: reviewedHead?.type === "blob" ? reviewedHead.object : null,
        sharedBaseBlobSha1: sharedBase?.type === "blob" ? sharedBase.object : null,
        headBlobSha1: head?.type === "blob" ? head.object : null,
      };
    });
    return {
      laneId: lane.laneId,
      worktreePath: lane.worktreePath,
      branch,
      headSha,
      mergeBaseSha,
      baseIsAncestor: ancestor.status === 0,
      cleanWorktree,
      entries,
      frozenArtifacts,
    };
  });
  return {
    schemaVersion: GIT_EVIDENCE_SCHEMA_VERSION,
    baseMainSha: plan.sharedBase.mainSha,
    derivedBaseMainTree,
    authorityResultingMainSha: authoritySha,
    derivedAuthorityResultingMainTree,
    reviewedHeadSha,
    derivedReviewedHeadTree,
    authorityBaseIsAncestorOfSharedBase: authorityAncestor.status === 0,
    completedIntegrationReceipts,
    lanes: laneEvidence,
  };
}

async function runCli() {
  const rootUrl = new URL("../../", import.meta.url);
  const contractPath = process.argv[2]
    ? pathToFileURL(process.argv[2])
    : new URL("config/dabangil-parallel-execution-v1.json", rootUrl);
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  let validation;
  if (process.argv[3]) {
    const plan = JSON.parse(await readFile(pathToFileURL(process.argv[3]), "utf8"));
    const commonGitDirectory = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], process.cwd()).trim();
    const evidence = collectParallelExecutionGitEvidence(plan, path.dirname(commonGitDirectory));
    validation = validateParallelExecutionPlan(plan, contract, evidence);
  } else validation = validateParallelExecutionAuthority(contract);
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ valid: true, amendmentId: contract.amendmentId, remoteMutationCount: 0 }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await runCli();
