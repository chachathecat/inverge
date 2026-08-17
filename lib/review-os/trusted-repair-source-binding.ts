import "server-only";

import type { TrustedRepairFixture } from "./trusted-repair-contract";
import {
  SYNTHETIC_SOURCE_BINDING,
  type TrustedRepairSourceBindingState,
} from "./trusted-repair-engine";

export function resolveTrustedRepairSourceBinding(
  fixture: TrustedRepairFixture,
): TrustedRepairSourceBindingState {
  if (
    fixture.subject !== "appraisal_practical" ||
    fixture.sourceBinding.sourceType !== "synthetic" ||
    fixture.sourceBinding.requiredStatus !== "synthetic_fixture"
  ) {
    throw new Error("trusted-repair:non-practice-source-binding-blocked");
  }
  return SYNTHETIC_SOURCE_BINDING;
}
