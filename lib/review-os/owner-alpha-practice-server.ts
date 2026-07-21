import "server-only";

import crypto from "node:crypto";

import {
  assertCanRunAnswerReview,
  EntitlementBlockedError,
} from "./entitlement-enforcement";
import { ownerAlphaPracticeProvider } from "./owner-alpha-practice-provider";
import { OwnerAlphaProviderError } from "./owner-alpha-practice-provider-contract";
import { createOwnerAlphaPracticeRepository } from "./owner-alpha-practice-repository";
import { OwnerAlphaPracticeRuntime } from "./owner-alpha-practice-runtime";

export async function createOwnerAlphaPracticeRuntime(userId: string) {
  const repository = await createOwnerAlphaPracticeRepository(userId);
  return new OwnerAlphaPracticeRuntime({
    repository,
    provider: ownerAlphaPracticeProvider,
    assertReferenceEntitlement: async () => {
      try {
        await assertCanRunAnswerReview(userId);
      } catch (error) {
        if (error instanceof EntitlementBlockedError) {
          throw new OwnerAlphaProviderError(
            error.code.includes("LIMIT") ? "quota" : "unavailable",
          );
        }
        throw error;
      }
    },
    now: () => new Date(),
    createId: () => crypto.randomUUID(),
    userId,
  });
}
