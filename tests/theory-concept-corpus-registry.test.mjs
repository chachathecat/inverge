import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildTheoryConceptCorpusReport,
  loadTheoryConceptCorpusRegistry,
  loadTheoryConceptCorpusReport,
} from "../lib/review-os/theory-concept-corpus-registry.ts";

const defaultPaths = {
  registry: "reference_corpus/theory_sources/appraiser_second_round_theory_concepts.json",
  report: "reference_corpus/theory_sources/appraiser_second_round_theory_concept_report.json",
  docs: "docs/s209-theory-concept-corpus-validator.md",
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function contentPolicy() {
  return {
    metadataOnly: true,
    rawDefinitionTextStored: false,
    rawOfficialQuestionTextStored: false,
    rawOfficialAnswerTextStored: false,
    rawReferenceAnswerTextStored: false,
    rawLearnerAnswerStored: false,
    rawOcrTextStored: false,
    rawSourceExcerptStored: false,
    rawTextbookOrAcademyExplanationStored: false,
    rawAssetBytesStored: false,
    providerPayloadStored: false,
  };
}

function syntheticVerifiedConcept() {
  return {
    conceptId: "synthetic-s209-market-value",
    subjectScope: ["theory"],
    unit: "synthetic_theory_unit",
    conceptTitleKo: "Synthetic S209 Concept",
    conceptKind: "valuation_standard",
    definitionStatus: "synthetic_fixture",
    sourceStatus: "synthetic_fixture",
    provenance: [
      {
        provenanceId: "synthetic-s209-provenance",
        provider: "synthetic_fixture",
        sourceLabel: "Synthetic S209 source metadata",
        officialUrl: "https://example.test/s209-theory-concept",
        officialSourceId: "synthetic-s209-source",
        status: "synthetic_fixture",
        verificationNote: "Synthetic fixture only; no definition, source excerpt, answer, or learner material is stored.",
        sourceExcerptStored: false,
      },
    ],
    aliases: [
      {
        aliasId: "synthetic-s209-alias",
        labelKo: "Synthetic S209 Concept",
        aliasKind: "canonical_title",
        status: "synthetic_fixture",
        sourceStatus: "synthetic_fixture",
      },
    ],
    relationIds: [],
    alternativeViewIds: [],
    uncertaintyNotes: [],
    downstreamUse: {
      s212TheoryReviewInputAllowed: true,
      s214ReferenceGenerationInputAllowed: true,
      s215ReleaseGateInputAllowed: true,
      s207PackageReleaseAnchorAllowed: true,
      s205RubricEvidenceSourceAllowed: true,
      highConfidenceTheoryClaimAllowed: true,
      blockUntilResolved: false,
    },
    blockerIds: [],
    contentPolicy: contentPolicy(),
  };
}

function syntheticVerifiedAnchor() {
  return {
    anchorId: "synthetic-s209-concept-anchor",
    conceptId: "synthetic-s209-market-value",
    anchorKind: "concept_identity",
    locator: {
      kind: "concept_id",
      ref: "synthetic-s209-market-value",
      rawTextStored: false,
      excerptStored: false,
      bodyTextStored: false,
    },
    sourceStatus: "synthetic_fixture",
    definitionStatus: "synthetic_fixture",
    blockerIds: [],
    s207SourceAnchorKind: "theory_concept_source",
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
    concepts: [syntheticVerifiedConcept()],
    conceptAnchors: [syntheticVerifiedAnchor()],
    conceptRelations: [],
    alternativeViews: [],
    theoryConceptChecks: [
      {
        checkId: "synthetic-s209-concept-check",
        questionId: "synthetic-s209-theory-question",
        conceptIds: ["synthetic-s209-market-value"],
        conceptAnchorIds: ["synthetic-s209-concept-anchor"],
        conceptStatus: "synthetic_fixture",
        definitionStatus: "synthetic_fixture",
        relationshipStatus: "synthetic_fixture",
        sourceCoverageStatus: "synthetic_fixture",
        releaseConfidence: {
          status: "high_allowed",
          s212HighConfidenceAllowed: true,
          s212ReviewAllowed: true,
          s214GenerationAllowed: true,
          s215ReleaseGateAllowed: true,
        },
        blockerIds: [],
        s207ReferencePackageIds: ["synthetic-s209-reference-package"],
        s205SourceReferenceIds: ["synthetic-s209-s205-source-ref"],
        metadataOnly: true,
      },
    ],
    referencePackageLinks: [
      {
        linkId: "synthetic-s209-reference-package-link",
        referencePackageId: "synthetic-s209-reference-package",
        questionId: "synthetic-s209-theory-question",
        packageReleaseStatus: "ready_for_s215",
        theoryConceptAnchorIds: ["synthetic-s209-concept-anchor"],
        conceptStatus: "synthetic_fixture",
        releaseGateStatus: "eligible_for_s215",
        releaseReady: true,
        blockerIds: [],
        containsRawContent: false,
      },
    ],
    evidenceReviewLinks: [
      {
        linkId: "synthetic-s209-evidence-review-link",
        reviewContractVersion: "s205.common_rubric_evidence.v1",
        sourceVerificationRefId: "synthetic-s209-s205-source-ref",
        theoryConceptAnchorId: "synthetic-s209-concept-anchor",
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
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s209-theory-concept-"));
  const registry = await readJson(defaultPaths.registry);
  mutator(registry);

  const registryPath = path.join(fixtureDir, "theory_concepts.json");
  const reportPath = path.join(fixtureDir, "theory_concept_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const config = { registryPath, reportPath };
  if (validate) {
    const loadedRegistry = loadTheoryConceptCorpusRegistry(config);
    const report = buildTheoryConceptCorpusReport(loadedRegistry, config);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return config;
}

test("S209 default theory concept corpus loads as metadata-only blocked candidate corpus", () => {
  const registry = loadTheoryConceptCorpusRegistry();
  const report = loadTheoryConceptCorpusReport();

  assert.equal(registry.registryScope, "appraiser_second_round_theory_only");
  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.boundaryPolicy.theoryAnswerReviewEngineImplemented, false);
  assert.equal(registry.boundaryPolicy.referenceAnswerGenerationImplemented, false);
  assert.equal(registry.concepts.length, 10);
  assert.equal(registry.conceptAnchors.length, 10);
  assert.equal(registry.conceptRelations.length, 7);
  assert.equal(registry.concepts.every((concept) => concept.sourceStatus === "needs_official_verification"), true);
  assert.equal(registry.concepts.every((concept) => concept.definitionStatus === "needs_official_verification"), true);
  assert.equal(registry.concepts.every((concept) => concept.downstreamUse.highConfidenceTheoryClaimAllowed === false), true);
  assert.equal(registry.concepts.every((concept) => concept.contentPolicy.rawDefinitionTextStored === false), true);

  assert.equal(report.totals.conceptCount, 10);
  assert.equal(report.totals.verifiedConceptCount, 0);
  assert.equal(report.totals.needsOfficialVerificationCount, 10);
  assert.equal(report.totals.openBlockingBlockerCount, 19);
  assert.equal(report.safeUse, "s209_theory_concept_corpus_validation_only");
});

test("S209 report is deterministic and CLI-checkable", () => {
  const registry = loadTheoryConceptCorpusRegistry();
  const report = loadTheoryConceptCorpusReport();
  assert.deepEqual(report, buildTheoryConceptCorpusReport(registry));

  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-theory-concept-corpus.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S209 theory concept corpus validation passed/);
});

test("S209 validator accepts synthetic release-ready theory concept metadata only in fixture mode", async () => {
  const config = await makeFixtureConfig((registry) => {
    Object.assign(registry, syntheticVerifiedRegistry(registry));
  });
  const registry = loadTheoryConceptCorpusRegistry(config);
  const report = loadTheoryConceptCorpusReport(config);

  assert.equal(registry.boundaryPolicy.syntheticFixturesOnly, true);
  assert.equal(registry.concepts[0].sourceStatus, "synthetic_fixture");
  assert.equal(registry.theoryConceptChecks[0].releaseConfidence.s212HighConfidenceAllowed, true);
  assert.equal(registry.referencePackageLinks[0].releaseReady, true);
  assert.equal(registry.evidenceReviewLinks[0].reviewConfidence, "high");
  assert.equal(report.totals.verifiedConceptCount, 1);
  assert.equal(report.totals.highConfidenceReviewAllowedCheckCount, 1);
  assert.equal(report.totals.blockedReleasePackageLinkCount, 0);
});

test("S209 validation rejects raw content fields and unresolved concept graph IDs", async () => {
  const rawFieldConfig = await makeFixtureConfig((registry) => {
    registry.concepts[0].definitionText = "raw definition text must not be committed";
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(rawFieldConfig),
    /definitionText/,
  );

  const missingConceptConfig = await makeFixtureConfig((registry) => {
    registry.conceptRelations[0].toConceptId = "missing-theory-concept";
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(missingConceptConfig),
    /unknown id|concept relation endpoint/,
  );

  const missingRelationConfig = await makeFixtureConfig((registry) => {
    registry.concepts[0].relationIds = ["missing-theory-relation"];
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(missingRelationConfig),
    /relationIds references unknown id/,
  );
});

test("S209 validation requires provenance and lastVerifiedAt for verified real concepts", async () => {
  const missingLastVerifiedAtConfig = await makeFixtureConfig((registry) => {
    registry.concepts[0].sourceStatus = "verified";
    registry.concepts[0].definitionStatus = "verified";
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(missingLastVerifiedAtConfig),
    /lastVerifiedAt/,
  );

  const missingProvenanceConfig = await makeFixtureConfig((registry) => {
    registry.concepts[0].sourceStatus = "verified";
    registry.concepts[0].definitionStatus = "verified";
    registry.concepts[0].lastVerifiedAt = "2026-06-28";
    registry.concepts[0].provenance = [];
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(missingProvenanceConfig),
    /provenance/,
  );
});

test("S209 validation keeps synthetic fixtures out of the committed real corpus", async () => {
  const config = await makeFixtureConfig((registry) => {
    registry.concepts[0].sourceStatus = "synthetic_fixture";
    registry.concepts[0].definitionStatus = "synthetic_fixture";
    registry.concepts[0].provenance[0].status = "synthetic_fixture";
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(config),
    /synthetic_fixture theory concepts are allowed only/,
  );
});

test("S209 validation blocks high-confidence S212/S214/S215 paths for unresolved real concepts", async () => {
  const highConfidenceCheckConfig = await makeFixtureConfig((registry) => {
    registry.theoryConceptChecks = [
      {
        checkId: "synthetic-s209-unresolved-high-confidence-check",
        questionId: "synthetic-s209-theory-question",
        conceptIds: ["theory-concept-market-value"],
        conceptAnchorIds: ["theory-anchor-market-value-candidate"],
        conceptStatus: "needs_official_verification",
        definitionStatus: "needs_official_verification",
        relationshipStatus: "needs_official_verification",
        sourceCoverageStatus: "needs_official_verification",
        releaseConfidence: {
          status: "high_allowed",
          s212HighConfidenceAllowed: true,
          s212ReviewAllowed: true,
          s214GenerationAllowed: true,
          s215ReleaseGateAllowed: true,
        },
        blockerIds: ["theory-blocker-market-value-official-verification"],
        s207ReferencePackageIds: [],
        s205SourceReferenceIds: [],
        metadataOnly: true,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(highConfidenceCheckConfig),
    /high-confidence S212\/S214\/S215 theory use requires verified concepts/,
  );

  const downstreamFlagConfig = await makeFixtureConfig((registry) => {
    registry.concepts[0].downstreamUse.s212TheoryReviewInputAllowed = true;
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(downstreamFlagConfig),
    /unresolved theory concept status must block high-confidence/,
  );
});

test("S209 validation prevents alternative views and uncertainty notes from becoming official claims", async () => {
  const registry = loadTheoryConceptCorpusRegistry();
  assert.equal(registry.alternativeViews.every((view) => view.officialClaimAllowed === false), true);
  assert.equal(registry.concepts.flatMap((concept) => concept.uncertaintyNotes).every((note) => note.officialClaimAllowed === false), true);

  const alternativeClaimConfig = await makeFixtureConfig((draft) => {
    draft.alternativeViews[0].officialClaimAllowed = true;
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(alternativeClaimConfig),
    /officialClaimAllowed/,
  );

  const uncertaintyClaimConfig = await makeFixtureConfig((draft) => {
    draft.concepts.find((concept) => concept.conceptId === "theory-concept-market-value").uncertaintyNotes[0].officialClaimAllowed = true;
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(uncertaintyClaimConfig),
    /officialClaimAllowed/,
  );
});

test("S209 validation fails closed for S207 package links and S205 evidence links with open concept blockers", async () => {
  const packageLinkConfig = await makeFixtureConfig((registry) => {
    registry.referencePackageLinks = [
      {
        linkId: "synthetic-s209-blocked-package-link",
        referencePackageId: "synthetic-s209-reference-package",
        questionId: "synthetic-s209-theory-question",
        packageReleaseStatus: "ready_for_s215",
        theoryConceptAnchorIds: ["theory-anchor-market-value-candidate"],
        conceptStatus: "needs_official_verification",
        releaseGateStatus: "blocked_by_theory_concept",
        releaseReady: true,
        blockerIds: ["theory-blocker-market-value-official-verification"],
        containsRawContent: false,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(packageLinkConfig),
    /release-ready package links require verified theory concepts/,
  );

  const evidenceLinkConfig = await makeFixtureConfig((registry) => {
    registry.evidenceReviewLinks = [
      {
        linkId: "synthetic-s209-unresolved-evidence-link",
        reviewContractVersion: "s205.common_rubric_evidence.v1",
        sourceVerificationRefId: "synthetic-s209-s205-source-ref",
        theoryConceptAnchorId: "theory-anchor-market-value-candidate",
        s205SourceStatus: "verified",
        s205WithholdReasons: [],
        reviewConfidence: "high",
        blockerIds: ["theory-blocker-market-value-official-verification"],
        containsRawContent: false,
      },
    ];
  }, { validate: false });
  assert.throws(
    () => loadTheoryConceptCorpusRegistry(evidenceLinkConfig),
    /s205SourceStatus cannot be verified|reviewConfidence high/,
  );
});

test("S209 registry introduces no learner, instructor, runtime, provider, billing, OCR, auth, or API behavior", () => {
  const registry = loadTheoryConceptCorpusRegistry();
  assert.equal(registry.boundaryPolicy.theoryAnswerReviewEngineImplemented, false);
  assert.equal(registry.boundaryPolicy.referenceAnswerGenerationImplemented, false);
  assert.equal(registry.boundaryPolicy.billingOrLedgerImplemented, false);
  assert.equal(registry.boundaryPolicy.publicArchiveUiImplemented, false);
  assert.equal(registry.boundaryPolicy.instructorRuntimeRoutesChanged, false);
  assert.equal(registry.boundaryPolicy.providerCallsImplemented, false);
  assert.equal(registry.boundaryPolicy.authOrEntitlementChanged, false);
  assert.equal(registry.boundaryPolicy.ocrRuntimeImplemented, false);
});

test("S209 docs describe downstream use and data-boundary limits", async () => {
  const docs = await readFile(defaultPaths.docs, "utf8");
  for (const token of ["S212", "S214", "S215", "S207", "S205"]) {
    assert.match(docs, new RegExp(token));
  }
  assert.match(docs, /metadata-only/);
  assert.match(docs, /raw official question text/);
  assert.match(docs, /source excerpt/);
  assert.match(docs, /needs_official_verification/);
});
