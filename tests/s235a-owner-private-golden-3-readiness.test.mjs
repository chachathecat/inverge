import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  S235A_EXPECTED_CONTROL_PLANE_STATE,
  S235A_EXPECTED_LAW_VERSION_EVIDENCE,
  S235A_EXPECTED_O3A_PACKET,
  S235A_EXPECTED_PRIVATE_PACKAGES,
  S235A_EXPECTED_RIGHTS_EVIDENCE,
  S235A_FUTURE_PACKAGE_IDS,
  S235A_INDEPENDENT_AUDIT_RECEIPT_ID,
  S235A_INDEPENDENT_AUDIT_RESULT_SHA256,
  S235A_SELECTION_IDS,
  S235A_SUBJECT_ORDER,
  buildS235aReadinessReport,
  buildS235aTrustedReadinessManifest,
  s235aCanonicalSha256,
  stableS235aStringify,
  validateS235aReadinessManifest,
  validateS235aReadinessReport,
} from "../lib/review-os/s235a-owner-private-golden-3-readiness.ts";

const MANIFEST_PATH =
  "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness.json";
const REPORT_PATH =
  "reference_corpus/readiness/appraiser/second_round_owner_private_golden_3_readiness_report.json";
const IMPLEMENTATION_PATH =
  "lib/review-os/s235a-owner-private-golden-3-readiness.ts";

const EXPECTED_Q1_TEXT_DIGESTS = [
  "c39314d7669a77a4eaa1a07523041191c68200f1a84b5e154236a0b41408f108",
  "a63f98242a1c79f4a6461430f7b18604ae5c0cb9862fba831962c117080d3872",
  "8092798a574ee3a88d1211cac6a7afb1eb65939dac18a271ef6e2f300bc97a47",
];
const EXPECTED_PAPER_DIGESTS = [
  "9c6a4fbf1d06f1d827bb8c8ddc6eb7cfb4c9218208540c95e62e772f4bc466c2",
  "5b10f1ffb2e39b82260d0d6cad3631ab7429cf80716ad0c1b39b44252d65b32c",
  "8e1ae7faa097ea7fb6de300208188992032e44ade9ca767179fedf234f69249a",
];
const EXPECTED_PAGE_RANGES = [
  {
    startPage: 1,
    endPage: 9,
    q2BoundaryPage: 10,
    boundaryPageSharedWithQ2: false,
  },
  {
    startPage: 1,
    endPage: 1,
    q2BoundaryPage: 2,
    boundaryPageSharedWithQ2: false,
  },
  {
    startPage: 1,
    endPage: 2,
    q2BoundaryPage: 3,
    boundaryPageSharedWithQ2: false,
  },
];

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function assertRejected(candidate, expectedCode) {
  const result = validateS235aReadinessManifest(candidate);
  assert.equal(result.valid, false, "hostile candidate must fail closed");
  assert.ok(
    result.errors.some((error) => error.startsWith(`${expectedCode}:`)),
    `expected ${expectedCode}, received ${result.errors.join(" | ")}`,
  );
}

test("committed readiness manifest and report are exact deterministic trusted artifacts", async () => {
  const manifest = await loadJson(MANIFEST_PATH);
  const report = await loadJson(REPORT_PATH);

  assert.deepEqual(manifest, buildS235aTrustedReadinessManifest());
  assert.deepEqual(report, buildS235aReadinessReport(manifest));
  assert.deepEqual(validateS235aReadinessManifest(manifest), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateS235aReadinessReport(manifest, report), {
    valid: true,
    errors: [],
  });
  assert.equal(
    stableS235aStringify(manifest),
    stableS235aStringify(buildS235aTrustedReadinessManifest()),
  );
  assert.equal(
    report.manifestDigestSha256,
    s235aCanonicalSha256(manifest),
  );
  assert.equal(
    report.o3aPacketDigestSha256,
    s235aCanonicalSha256(manifest.o3aApprovalPacket),
  );
});

test("scope is exactly one 2026 Q1 practice, theory, and Law selection", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  assert.deepEqual(manifest.examIdentity.subjects, S235A_SUBJECT_ORDER);
  assert.deepEqual(
    manifest.selections.map((selection) => selection.selectionId),
    S235A_SELECTION_IDS,
  );
  assert.deepEqual(
    manifest.selections.map((selection) => selection.subject),
    S235A_SUBJECT_ORDER,
  );
  assert.ok(
    manifest.selections.every(
      (selection) =>
        selection.examYear === 2026 && selection.questionNo === 1,
    ),
  );
  assert.deepEqual(
    manifest.selections.map(
      (selection) => selection.fidelity.q1TextDigestSha256,
    ),
    EXPECTED_Q1_TEXT_DIGESTS,
  );
  assert.deepEqual(
    manifest.selections.map((selection) => selection.source.paperSha256),
    EXPECTED_PAPER_DIGESTS,
  );
  assert.deepEqual(
    manifest.selections.map((selection) => selection.fidelity.pageRange),
    EXPECTED_PAGE_RANGES,
  );
  assert.equal(new Set(EXPECTED_Q1_TEXT_DIGESTS).size, 3);
  manifest.selections.forEach((selection) => {
    assert.notEqual(
      selection.fidelity.q1TextDigestSha256,
      selection.source.paperSha256,
    );
    assert.notEqual(
      selection.fidelity.q1TextDigestSha256,
      selection.fidelity.structuralAnchorSha256,
    );
  });
});

test("source, rights, independent audit, Law version, and private package evidence is exact", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  assert.deepEqual(manifest.rightsEvidence, S235A_EXPECTED_RIGHTS_EVIDENCE);
  assert.equal(
    manifest.rightsEvidence.freshDetailVerificationStatus,
    "parsed_exact_attachment_identity_passed",
  );
  assert.equal(
    manifest.rightsEvidence.freshNoticeVerificationStatus,
    "access_blocked_no_rights_reverification",
  );
  assert.equal(
    manifest.rightsEvidence.freshNoticeAccessBlockDetected,
    true,
  );
  assert.equal(
    manifest.rightsEvidence.freshNoticeRightsMarkersConfirmed,
    false,
  );
  assert.equal(
    manifest.rightsEvidence.freshNoticeResponseUse,
    "negative_freshness_receipt_only",
  );
  assert.equal(
    manifest.rightsEvidence.historicalNoticeScopeEvidenceUsed,
    true,
  );
  assert.deepEqual(
    manifest.lawVersionEvidence,
    S235A_EXPECTED_LAW_VERSION_EVIDENCE,
  );
  assert.deepEqual(
    manifest.privatePackageReadiness,
    S235A_EXPECTED_PRIVATE_PACKAGES,
  );
  assert.deepEqual(
    manifest.privatePackageReadiness.map((candidate) => candidate.packageId),
    S235A_FUTURE_PACKAGE_IDS,
  );
  assert.ok(
    manifest.selections.every(
      (selection) =>
        selection.source.authority === "qnet" &&
        selection.source.sourceStatus ===
          "official_primary_source_hash_verified" &&
        selection.fidelity.independentAudit.receiptId ===
          S235A_INDEPENDENT_AUDIT_RECEIPT_ID &&
        selection.fidelity.independentAudit.privateAuditResultSha256 ===
          S235A_INDEPENDENT_AUDIT_RESULT_SHA256 &&
        selection.fidelity.independentAudit.status === "passed",
    ),
  );
  assert.ok(
    manifest.privatePackageReadiness.every(
      (candidate) =>
        candidate.status === "private_schema_ready_not_generated" &&
        candidate.privateVaultRequired === true &&
        candidate.generated === false &&
        candidate.bodyCommitted === false &&
        candidate.s214Started === false &&
        candidate.s215Started === false &&
        candidate.released === false,
    ),
  );
});

test("future O3A packet is exact, pending, narrow, expiring, and cannot start downstream work", async () => {
  const manifest = await loadJson(MANIFEST_PATH);
  const report = await loadJson(REPORT_PATH);

  assert.deepEqual(manifest.o3aApprovalPacket, S235A_EXPECTED_O3A_PACKET);
  assert.deepEqual(
    manifest.controlPlaneState,
    S235A_EXPECTED_CONTROL_PLANE_STATE,
  );
  assert.deepEqual(manifest.controlPlaneState.selectedItemIds, [
    "S235B",
    "O3A",
  ]);
  assert.equal(manifest.o3aApprovalPacket.ownerApproved, false);
  assert.equal(manifest.o3aApprovalPacket.wildcardScopeAllowed, false);
  assert.equal(manifest.o3aApprovalPacket.automaticStartAllowed, false);
  assert.equal(manifest.o3aApprovalPacket.manualS236AStartRequired, true);
  assert.equal(manifest.o3aApprovalPacket.o3aStarted, false);
  assert.equal(manifest.o3aApprovalPacket.s236aStarted, false);
  assert.equal(report.executionStatus, "blocked_pending_o3a");
  assert.deepEqual(report.approvalGateCodes, [
    "o3a_owner_decision_pending",
  ]);
});

test("closed schema rejects unknown roots, unknown nested fields, fourth selections, and reordered selections", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  const unknownRoot = clone(manifest);
  unknownRoot.extra = true;
  assertRejected(unknownRoot, "s235a_closed_schema");

  const unknownNested = clone(manifest);
  unknownNested.selections[0].source.unreviewed = true;
  assertRejected(unknownNested, "s235a_closed_schema");

  const fourthSelection = clone(manifest);
  fourthSelection.selections.push(clone(fourthSelection.selections[0]));
  assertRejected(fourthSelection, "s235a_closed_schema");

  const reordered = clone(manifest);
  reordered.selections.reverse();
  assertRejected(reordered, "s235a_selection_mismatch");
});

test("hostile selection and provenance mutations fail closed", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  const q2 = clone(manifest);
  q2.selections[0].questionNo = 2;
  assertRejected(q2, "s235a_selection_mismatch");

  const priorYear = clone(manifest);
  priorYear.selections[1].examYear = 2025;
  assertRejected(priorYear, "s235a_selection_mismatch");

  const wrongAsset = clone(manifest);
  wrongAsset.selections[2].source.fileSequence = "2261216";
  assertRejected(wrongAsset, "s235a_source_provenance_mismatch");

  const placeholderHash = clone(manifest);
  placeholderHash.selections[0].source.paperSha256 = "0".repeat(64);
  assertRejected(placeholderHash, "s235a_source_provenance_mismatch");
});

test("hostile Q1 digest, boundary, visual, and independent-audit mutations fail closed", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  const paperDigestReuse = clone(manifest);
  paperDigestReuse.selections[0].fidelity.q1TextDigestSha256 =
    paperDigestReuse.selections[0].source.paperSha256;
  assertRejected(paperDigestReuse, "s235a_q1_fidelity_mismatch");

  const anchorDigestReuse = clone(manifest);
  anchorDigestReuse.selections[1].fidelity.q1TextDigestSha256 =
    anchorDigestReuse.selections[1].fidelity.structuralAnchorSha256;
  assertRejected(anchorDigestReuse, "s235a_q1_fidelity_mismatch");

  const q2BoundaryIncluded = clone(manifest);
  q2BoundaryIncluded.selections[2].fidelity.pageRange.endPage = 3;
  assertRejected(q2BoundaryIncluded, "s235a_q1_fidelity_mismatch");

  const visualDigestChanged = clone(manifest);
  visualDigestChanged.selections[0].fidelity.visualPageDigests[5].sha256 =
    "2".repeat(64);
  assertRejected(visualDigestChanged, "s235a_q1_fidelity_mismatch");

  const auditMissing = clone(manifest);
  auditMissing.selections[0].fidelity.independentAudit.status = "failed";
  assertRejected(auditMissing, "s235a_independent_audit_missing");
});

test("hostile rights, Law-version, and private-package mutations fail closed", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  const rightsBroadened = clone(manifest);
  rightsBroadened.rightsEvidence.mostRestrictiveDecision.publicUseAllowed =
    true;
  assertRejected(rightsBroadened, "s235a_rights_scope_mismatch");

  const assetUnbound = clone(manifest);
  assetUnbound.rightsEvidence.boundSourceIds.pop();
  assertRejected(assetUnbound, "s235a_rights_scope_mismatch");

  const blockedNoticePromoted = clone(manifest);
  blockedNoticePromoted.rightsEvidence.freshNoticeRightsMarkersConfirmed =
    true;
  assertRejected(blockedNoticePromoted, "s235a_rights_scope_mismatch");

  const lawEffectiveAfterExam = clone(manifest);
  lawEffectiveAfterExam.lawVersionEvidence.effectiveFrom = "2026-07-05";
  assertRejected(lawEffectiveAfterExam, "s235a_law_version_mismatch");

  const currentLawSubstitution = clone(manifest);
  currentLawSubstitution.lawVersionEvidence.currentLawSubstitutedForExamDateLaw =
    true;
  assertRejected(currentLawSubstitution, "s235a_law_version_mismatch");

  const generatedPackage = clone(manifest);
  generatedPackage.privatePackageReadiness[0].generated = true;
  assertRejected(generatedPackage, "s235a_private_package_state_invalid");

  const releaseStarted = clone(manifest);
  releaseStarted.privatePackageReadiness[2].s215Started = true;
  assertRejected(releaseStarted, "s235a_private_package_state_invalid");
});

test("hostile O3A approval, wildcard, auto-start, and control-plane mutations fail closed", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  const preapproved = clone(manifest);
  preapproved.o3aApprovalPacket.ownerApproved = true;
  assertRejected(preapproved, "s235a_o3a_packet_invalid");

  const wildcard = clone(manifest);
  wildcard.o3aApprovalPacket.requestedScope = "*";
  assertRejected(wildcard, "s235a_o3a_packet_invalid");

  const expired = clone(manifest);
  expired.o3aApprovalPacket.packetExpiresAt = "2026-07-22T14:59:59.000Z";
  assertRejected(expired, "s235a_o3a_packet_invalid");

  const autoStart = clone(manifest);
  autoStart.o3aApprovalPacket.automaticStartAllowed = true;
  assertRejected(autoStart, "s235a_o3a_packet_invalid");

  const started = clone(manifest);
  started.controlPlaneState.o3aStarted = true;
  started.controlPlaneState.s236aStarted = true;
  started.controlPlaneState.golden3Started = true;
  assertRejected(started, "s235a_o3a_packet_invalid");
});

test("privacy boundary rejects raw bodies, private locators, unsafe URLs, and evaluation configuration fields", async () => {
  const manifest = await loadJson(MANIFEST_PATH);

  for (const [key, value] of [
    ["questionText", "redacted"],
    ["learnerAnswer", "redacted"],
    ["privateFilePath", "/workspace/private/source.pdf"],
    ["evaluationModel", "example"],
  ]) {
    const hostile = clone(manifest);
    hostile[key] = value;
    assertRejected(hostile, "s235a_privacy_boundary");
  }

  const unsafeLocator = clone(manifest);
  unsafeLocator.manifestId = "s3://private-vault/object";
  assertRejected(unsafeLocator, "s235a_privacy_boundary");
});

test("stale or non-deterministic reports are rejected", async () => {
  const manifest = await loadJson(MANIFEST_PATH);
  const report = await loadJson(REPORT_PATH);

  const staleDigest = clone(report);
  staleDigest.manifestDigestSha256 = "3".repeat(64);
  const staleResult = validateS235aReadinessReport(
    manifest,
    staleDigest,
  );
  assert.equal(staleResult.valid, false);
  assert.ok(
    staleResult.errors.some((error) =>
      error.startsWith("s235a_report_evidence_digest_mismatch:"),
    ),
  );

  const invalidManifest = clone(manifest);
  invalidManifest.o3aApprovalPacket.s236aStarted = true;
  assert.deepEqual(
    validateS235aReadinessReport(invalidManifest, report),
    {
      valid: false,
      errors: [
        "s235a_report_evidence_digest_mismatch:manifest_invalid",
      ],
    },
  );
});

test("readiness validator is offline, deterministic, and cannot activate external systems", async () => {
  const source = await readFile(IMPLEMENTATION_PATH, "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /\bprocess\.env\b/u);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:provider|billing|telemetry|navigation)/iu);
  assert.doesNotMatch(source, /child_process|node:net|node:http|node:https/u);
});
