import "server-only";

import { loadLawSourceVersionRegistry } from "./law-source-version-registry";
import {
  SYNTHETIC_SOURCE_BINDING,
  type TrustedRepairLawBindingState,
} from "./trusted-repair-engine";
import type { TrustedRepairFixture } from "./trusted-repair-contract";

export function resolveTrustedRepairSourceBinding(
  fixture: TrustedRepairFixture,
): TrustedRepairLawBindingState {
  if (fixture.sourceBinding.sourceType === "synthetic") {
    return SYNTHETIC_SOURCE_BINDING;
  }

  const registry = loadLawSourceVersionRegistry();
  const source = registry.lawSources.find(
    (candidate) => candidate.sourceId === fixture.sourceBinding.sourceId,
  );
  const anchor = registry.sourceAnchors.find(
    (candidate) =>
      candidate.anchorId === fixture.sourceBinding.sourceAnchorId &&
      candidate.sourceId === fixture.sourceBinding.sourceId,
  );
  if (!source || !anchor) {
    return {
      bindingVersion: `${registry.schemaVersion}:${registry.generatedAt}`,
      sourceStatus: "blocked",
      versionStatus: "blocked",
      currentLawStatus: "current_law_unresolved",
      sourceAnchorId: null,
      blockerCount: 1,
    };
  }
  return {
    bindingVersion: `${registry.schemaVersion}:${registry.generatedAt}`,
    sourceStatus: source.sourceStatus,
    versionStatus: source.versionMetadata.versionStatus,
    currentLawStatus: source.versionMetadata.currentLawStatus,
    sourceAnchorId: anchor.anchorId,
    blockerCount: new Set([
      ...source.blockerIds,
      ...anchor.blockerIds,
    ]).size,
  };
}
