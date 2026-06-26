import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildLawSourceVersionReport,
  loadLawSourceVersionRegistry,
  loadLawSourceVersionReport,
} from "../lib/review-os/law-source-version-registry.ts";

const defaultPaths = {
  registry: "reference_corpus/legal_sources/appraiser_second_round_law_sources.json",
  report: "reference_corpus/legal_sources/appraiser_second_round_law_source_report.json",
  docs: "docs/s208-law-source-corpus-version-validator.md",
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function contentPolicy() {
  return {
    metadataOnly: true,
    rawStatuteTextStored: false,
    rawCaseTextStored: false,
    rawOfficialQuestionTextStored: false,
    rawOfficialAnswerTextStored: false,
    rawReferenceAnswerTextStored: false,
    rawLearnerAnswerStored: false,
    rawOcrTextStored: false,
    rawSourceExcerptStored: false,
    rawAssetBytesStored: false,
    thirdPartyAcademyContentStored: false,
  };
}

function syntheticVerifiedLawSource() {
  return {
    sourceId: "synthetic-s208-land-compensation-act",
    sourceKind: "statute",
    officialTitleKo: "Synthetic S208 Law Source",
    jurisdiction: "KR",
    subjectScope: ["law"],
    sourceStatus: "verified",
    lastVerifiedAt: "2026-06-26",
    provenance: {
      provider: "synthetic_fixture",
      officialUrl: "https://www.law.go.kr/LSW/synthetic-s208",
      officialSourceId: "synthetic-s208-official-law-page",
      status: "verified",
      lastVerifiedAt: "2026-06-26",
      verificationNote: "Synthetic fixture only; no real statute body or legal conclusion is stored.",
    },
    aliases: [
      {
        aliasId: "synthetic-s208-law-current-title",
        labelKo: "Synthetic S208 Law Source",
        aliasKind: "current_title",
        status: "verified",
        effectiveFrom: "2090-07-01",
        sourceStatus: "verified",
      },
    ],
    versionMetadata: {
      versionStatus: "verified",
      effectiveDate: "2090-07-01",
      effectiveDateStatus: "verified",
      amendedAt: "2090-07-01",
      amendmentStatus: "verified",
      repealStatus: "not_applicable",
      renameStatus: "not_applicable",
      currentLawStatus: "current_law_verified",
    },
    contentPolicy: contentPolicy(),
    downstreamUse: {
      s211LawReviewInputAllowed: true,
      s214ReferenceGenerationInputAllowed: true,
      s215ReleaseGateInputAllowed: true,
      s207PackageReleaseAnchorAllowed: true,
      s205RubricEvidenceSourceAllowed: true,
      highConfidenceLegalReviewAllowed: true,
      blockUntilResolved: false,
    },
    blockerIds: [],
  };
}

function syntheticVerifiedAnchor(sourceId = "synthetic-s208-land-compensation-act") {
  return {
    anchorId: "synthetic-s208-law-version-anchor",
    sourceId,
    anchorKind: "law_version",
    locator: {
      kind: "law_version_id",
      ref: "synthetic-s208-law-version-2090-07-01",
      versionLabel: "synthetic exam-date version",
      rawTextStored: false,
      excerptStored: false,
      bodyTextStored: false,
    },
    legalSourceStatus: "verified",
    versionStatus: "verified",
    effectiveDate: "2090-07-01",
    verifiedAt: "2026-06-26",
    blockerIds: [],
    s207SourceAnchorKind: "law_source_version",
    s205SourceReferenceKind: "subject_validator",
    containsRawContent: false,
  };
}

function syntheticVerifiedRegistry(base) {
  return {
    ...base,
    boundaryPolicy: {
      ...base.boundaryPolicy,
      syntheticFixturesOnly: true,
    },
    lawSources: [syntheticVerifiedLawSource()],
    sourceAnchors: [syntheticVerifiedAnchor()],
    examDateVersionChecks: [
      {
        checkId: "synthetic-s208-exam-date-check",
        questionId: "synthetic-s208-law-question",
        examDate: "2090-07-01",
        lawEffectiveDate: "2090-07-01",
        sourceAnchorIds: ["synthetic-s208-law-version-anchor"],
        legalSourceStatus: "verified",
        examDateVersionStatus: "applicable_to_exam_date",
        currentLawComparison: {
          status: "same_as_exam_date",
          currentLawAnchorIds: ["synthetic-s208-law-version-anchor"],
          divergenceDisclosureRequired: false,
          currentLawClaimAllowed: true,
          examDateLawClaimAllowed: true,
        },
        releaseConfidence: {
          status: "high_allowed",
          s211HighConfidenceAllowed: true,
          s211ReviewAllowed: true,
          s214GenerationAllowed: true,
          s215ReleaseGateAllowed: true,
        },
        blockerIds: [],
        s207ReferencePackageIds: ["synthetic-s208-reference-package"],
        s205SourceReferenceIds: ["synthetic-s208-s205-source-ref"],
        metadataOnly: true,
      },
    ],
    referencePackageLinks: [
      {
        linkId: "synthetic-s208-reference-package-link",
        referencePackageId: "synthetic-s208-reference-package",
        questionId: "synthetic-s208-law-question",
        packageReleaseStatus: "ready_for_s215",
        lawVersionAnchorIds: ["synthetic-s208-law-version-anchor"],
        legalSourceStatus: "verified",
        releaseGateStatus: "eligible_for_s215",
        releaseReady: true,
        blockerIds: [],
        containsRawContent: false,
      },
    ],
    evidenceReviewLinks: [
      {
        linkId: "synthetic-s208-evidence-review-link",
        reviewContractVersion: "s205.common_rubric_evidence.v1",
        sourceVerificationRefId: "synthetic-s208-s205-source-ref",
        lawVersionAnchorId: "synthetic-s208-law-version-anchor",
        s205SourceStatus: "verified",
        s205WithholdReasons: [],
        reviewConfidence: "high",
        blockerIds: [],
        containsRawContent: false,
      },
    ],
    blockers: [],
  };
}

async function makeFixtureConfig(mutator = () => {}, { validate = true } = {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s208-law-source-version-"));
  const registry = await readJson(defaultPaths.registry);
  mutator(registry);

  const registryPath = path.join(fixtureDir, "law_sources.json");
  const reportPath = path.join(fixtureDir, "law_source_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const config = { registryPath, reportPath };
  if (validate) {
    const loadedRegistry = loadLawSourceVersionRegistry(config);
    const report = buildLawSourceVersionReport(loadedRegistry, config);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return config;
}

test("S208 default law source registry loads as metadata-only blocked candidate corpus", () => {
  const registry = loadLawSourceVersionRegistry();
  const report = loadLawSourceVersionReport();

  assert.equal(registry.registryScope, "appraiser_second_round_law_only");
  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.boundaryPolicy.lawAnswerReviewEngineImplemented, false);
  assert.equal(registry.boundaryPolicy.referenceAnswerGenerationImplemented, false);
  assert.equal(registry.lawSources.length, 10);
  assert.equal(registry.sourceAnchors.length, 10);
  assert.equal(registry.examDateVersionChecks.length, 0);
  assert.equal(registry.lawSources.every((source) => source.sourceStatus === "needs_official_verification"), true);
  assert.equal(registry.lawSources.every((source) => source.versionMetadata.versionStatus === "needs_official_verification"), true);
  assert.equal(registry.lawSources.every((source) => source.downstreamUse.highConfidenceLegalReviewAllowed === false), true);
  assert.equal(registry.lawSources.every((source) => source.contentPolicy.rawStatuteTextStored === false), true);

  assert.equal(report.totals.lawSourceCount, 10);
  assert.equal(report.totals.verifiedLawSourceCount, 0);
  assert.equal(report.totals.needsOfficialVerificationCount, 10);
  assert.equal(report.totals.openBlockingBlockerCount, 10);
  assert.equal(report.safeUse, "s208_law_source_version_validation_only");
});

test("S208 report is deterministic and CLI-checkable", () => {
  const registry = loadLawSourceVersionRegistry();
  const report = loadLawSourceVersionReport();
  assert.deepEqual(report, buildLawSourceVersionReport(registry));

  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-law-source-version-registry.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S208 law source version registry validation passed/);
});

test("S208 validator accepts verified synthetic exam-date version, S207 link, and S205 link metadata", async () => {
  const config = await makeFixtureConfig((registry) => {
    Object.assign(registry, syntheticVerifiedRegistry(registry));
  });
  const registry = loadLawSourceVersionRegistry(config);
  const report = loadLawSourceVersionReport(config);

  assert.equal(registry.lawSources[0].sourceStatus, "verified");
  assert.equal(registry.sourceAnchors[0].legalSourceStatus, "verified");
  assert.equal(registry.examDateVersionChecks[0].examDateVersionStatus, "applicable_to_exam_date");
  assert.equal(registry.referencePackageLinks[0].releaseReady, true);
  assert.equal(registry.evidenceReviewLinks[0].s205SourceStatus, "verified");
  assert.equal(report.totals.verifiedLawSourceCount, 1);
  assert.equal(report.totals.highConfidenceReviewAllowedCheckCount, 1);
  assert.equal(report.totals.blockedReleasePackageLinkCount, 0);
});

test("S208 validation rejects raw content fields and missing source IDs", async () => {
  const rawFieldConfig = await makeFixtureConfig((registry) => {
    registry.lawSources[0].rawContent = "raw statute body must not be committed";
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(rawFieldConfig),
    /rawContent/,
  );

  const missingSourceConfig = await makeFixtureConfig((registry) => {
    registry.sourceAnchors[0].sourceId = "missing-law-source";
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(missingSourceConfig),
    /unknown law source|sourceId/,
  );
});

test("S208 validation rejects verified legal-source status without provenance and effective date", async () => {
  const missingEffectiveDateConfig = await makeFixtureConfig((registry) => {
    Object.assign(registry, syntheticVerifiedRegistry(registry));
    delete registry.lawSources[0].versionMetadata.effectiveDate;
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(missingEffectiveDateConfig),
    /effectiveDate/,
  );

  const missingProvenanceDateConfig = await makeFixtureConfig((registry) => {
    Object.assign(registry, syntheticVerifiedRegistry(registry));
    delete registry.lawSources[0].provenance.lastVerifiedAt;
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(missingProvenanceDateConfig),
    /lastVerifiedAt|source provenance/,
  );
});

test("S208 validation blocks current-law claims and release-ready links while exam-date version is unresolved", async () => {
  const currentLawClaimConfig = await makeFixtureConfig((registry) => {
    registry.examDateVersionChecks = [
      {
        checkId: "synthetic-s208-unresolved-current-law-claim",
        examDate: "2025-07-12",
        lawEffectiveDate: "2025-07-12",
        sourceAnchorIds: [registry.sourceAnchors[0].anchorId],
        legalSourceStatus: "needs_official_verification",
        examDateVersionStatus: "needs_official_verification",
        currentLawComparison: {
          status: "exam_date_version_unresolved",
          currentLawAnchorIds: [],
          divergenceDisclosureRequired: false,
          currentLawClaimAllowed: true,
          examDateLawClaimAllowed: false,
        },
        releaseConfidence: {
          status: "blocked",
          s211HighConfidenceAllowed: false,
          s211ReviewAllowed: false,
          s214GenerationAllowed: false,
          s215ReleaseGateAllowed: false,
        },
        blockerIds: [registry.blockers[0].blockerId],
        s207ReferencePackageIds: [],
        s205SourceReferenceIds: [],
        metadataOnly: true,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(currentLawClaimConfig),
    /current-law claims/,
  );

  const releaseReadyBlockedConfig = await makeFixtureConfig((registry) => {
    registry.referencePackageLinks = [
      {
        linkId: "synthetic-s208-blocked-package-link",
        referencePackageId: "synthetic-s208-package",
        packageReleaseStatus: "ready_for_s215",
        lawVersionAnchorIds: [registry.sourceAnchors[0].anchorId],
        legalSourceStatus: "needs_official_verification",
        releaseGateStatus: "blocked_by_legal_source",
        releaseReady: true,
        blockerIds: [registry.blockers[0].blockerId],
        containsRawContent: false,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(releaseReadyBlockedConfig),
    /release-ready package links/,
  );
});

test("S208 validation prevents S205 verified or high-confidence review links for unresolved legal sources", async () => {
  const config = await makeFixtureConfig((registry) => {
    registry.evidenceReviewLinks = [
      {
        linkId: "synthetic-s208-unresolved-evidence-link",
        reviewContractVersion: "s205.common_rubric_evidence.v1",
        sourceVerificationRefId: "synthetic-s208-s205-source-ref",
        lawVersionAnchorId: registry.sourceAnchors[0].anchorId,
        s205SourceStatus: "verified",
        s205WithholdReasons: [],
        reviewConfidence: "high",
        blockerIds: [registry.blockers[0].blockerId],
        containsRawContent: false,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadLawSourceVersionRegistry(config),
    /s205SourceStatus cannot be verified|reviewConfidence high/,
  );
});

test("S208 docs describe S211, S214, S215, S207, and S205 usage plus data boundaries", async () => {
  const docs = await readFile(defaultPaths.docs, "utf8");
  for (const token of ["S211", "S214", "S215", "S207", "S205"]) {
    assert.match(docs, new RegExp(token));
  }
  assert.match(docs, /metadata-only/);
  assert.match(docs, /exam-date/);
  assert.match(docs, /raw statute/);
  assert.match(docs, /needs_official_verification/);
});
