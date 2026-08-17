import "server-only";

import type { TrustedRepairFixture } from "./trusted-repair-contract";
import {
  SYNTHETIC_SOURCE_BINDING,
  SYNTHETIC_THEORY_SOURCE_BINDING,
  type TrustedRepairSourceBindingState,
} from "./trusted-repair-engine";

export function resolveTrustedRepairSourceBinding(
  fixture: TrustedRepairFixture,
): TrustedRepairSourceBindingState {
  if (
    !["appraisal_practical", "appraisal_theory"].includes(fixture.subject) ||
    fixture.sourceBinding.sourceType !== "synthetic" ||
    fixture.sourceBinding.requiredStatus !== "synthetic_fixture"
  ) {
    throw new Error("trusted-repair:unsupported-source-binding-blocked");
  }
  return fixture.subject === "appraisal_practical"
    ? SYNTHETIC_SOURCE_BINDING
    : SYNTHETIC_THEORY_SOURCE_BINDING;
}
