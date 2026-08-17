import "server-only";

import type { TrustedRepairFixture } from "./trusted-repair-contract";
import {
  loadTrustedRepairLawApplicabilitySnapshot,
  trustedRepairLawOpenBlockingReferenceIds,
} from "./law-source-version-registry";
import {
  SYNTHETIC_SOURCE_BINDING,
  SYNTHETIC_THEORY_SOURCE_BINDING,
  type TrustedRepairSourceBindingState,
} from "./trusted-repair-engine";

export function resolveTrustedRepairSourceBinding(
  fixture: TrustedRepairFixture,
): TrustedRepairSourceBindingState {
  if (
    !["appraisal_practical", "appraisal_theory", "appraisal_law"].includes(
      fixture.subject,
    ) ||
    fixture.sourceBinding.sourceType !== "synthetic" ||
    fixture.sourceBinding.requiredStatus !== "synthetic_fixture"
  ) {
    throw new Error("trusted-repair:unsupported-source-binding-blocked");
  }
  if (fixture.subject === "appraisal_practical") return SYNTHETIC_SOURCE_BINDING;
  if (fixture.subject === "appraisal_theory") {
    return SYNTHETIC_THEORY_SOURCE_BINDING;
  }
  const snapshot = loadTrustedRepairLawApplicabilitySnapshot();
  const openBlockingReferenceIds =
    trustedRepairLawOpenBlockingReferenceIds(snapshot);
  return {
    bindingVersion: snapshot.contractVersion,
    sourceStatus: snapshot.sourceStatus,
    versionStatus: snapshot.sourceStatus,
    currentLawStatus: snapshot.currentLawApplicability,
    sourceAnchorId: snapshot.lawAnchorId,
    blockerCount: openBlockingReferenceIds.length,
    openBlockingReferenceIds,
    lawSourceBindingId: snapshot.lawSourceBindingId,
    sourceId: snapshot.sourceId,
    sourceVersionId: snapshot.sourceVersionId,
    lawAnchorVersionId: snapshot.lawAnchorVersionId,
    anchorStatus: snapshot.anchorStatus,
    exactLocator: snapshot.exactLocator,
    exactVersionIdentity: snapshot.exactVersionIdentity,
    effectiveFrom: snapshot.effectiveFrom,
    effectiveTo: snapshot.effectiveTo,
    applicableAsOf: snapshot.applicableAsOf,
  } satisfies TrustedRepairSourceBindingState;
}
