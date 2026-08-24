import "server-only";

import crypto from "node:crypto";

import { getServerSessionUser, type InvergeServerSession } from "@/lib/auth/session";

import {
  C3R_P_FEATURE_FLAG,
  C3R_P_OWNER_ALLOWLIST,
  C3R_P_PLAN_COMPLETION_ACTIONS,
  C3R_P_RUNTIME_ARTIFACT_REF,
  C3R_P_VALIDATOR_ID,
  C3RPError,
  type C3RPPlanBlockInput,
  type C3RPPracticeClaimInput,
  type C3RPView,
} from "./c3r-p-contract";
import {
  C3R_P_SOURCE,
  buildC3RPPlan,
  c3rPBiggestGap,
  c3rPSha256,
  c3rPSourceView,
  evaluateC3RPPracticeClaim,
} from "./c3r-p-engine";
import { createC3RPRepository } from "./c3r-p-repository";

const EVIDENCE_TIMES = Object.freeze({
  d0: "2026-08-23T00:00:00.000Z",
  feedback: "2026-08-23T00:05:00.000Z",
  d1: "2026-08-24T00:06:00.000Z",
  d7: "2026-08-30T00:06:00.000Z",
  recurrence: "2026-09-02T00:06:00.000Z",
  reopen: "2026-09-03T00:06:00.000Z",
  plan: "2026-09-03T00:07:00.000Z",
  planToday: "2026-09-03T00:07:00.000Z",
  planFullDay: "2026-09-03T00:08:00.000Z",
  reopenComplete: "2026-09-03T00:09:00.000Z",
  reopenAgain: "2026-09-03T00:10:00.000Z",
});
const PRIMARY_SURFACE_ID = "server:practice-primary-v1" as const;
const TRANSFER_SURFACE_ID = "server:practice-transfer-v1" as const;
const FROZEN_CONFIGURATION = Object.freeze({
  answerReviewPolicyVersion: "c3r-p-practice-review@1",
  assistancePolicyVersion: "c3r-p-smallest-scaffold@1",
  contentReleaseArtifactVersion: C3R_P_SOURCE.artifactId,
  ledgerSchemaVersion: "c3r-p-ledger@1",
  measurementPolicyVersion: "c3r-p-independent-qualification@1",
  modelVersion: "none:deterministic-structured-practice@1",
  promptVersion: "trusted-repair-fixture:appraisal-practical@1",
  rubricVersion: "calculation-relation-anchor@1",
  schedulerPolicyVersion: "c3r-p-due-review@1",
  validatorVersion: C3R_P_VALIDATOR_ID,
});
const FROZEN_CONFIGURATION_DIGEST = c3rPSha256(FROZEN_CONFIGURATION);

function emails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
function productionDenied() {
  if (process.env.VERCEL_ENV === "production") return true;
  return (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview" &&
    process.env.C3R_P_LOCAL_EVIDENCE_MODE !== "true"
  );
}

function isOwner(email: string | null) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    emails(process.env.ALPHA_ADMIN_EMAILS).includes(normalized) &&
    emails(process.env[C3R_P_OWNER_ALLOWLIST]).includes(normalized)
  );
}

export async function requireC3RPAccess(): Promise<
  InvergeServerSession & { userId: string }
> {
  if (process.env[C3R_P_FEATURE_FLAG] !== "true") {
    throw new C3RPError("feature_disabled");
  }
  if (productionDenied()) throw new C3RPError("production_denied");
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    throw new C3RPError("auth_required");
  }
  if (!isOwner(session.email)) throw new C3RPError("owner_required");
  return { ...session, userId: session.userId };
}

function now(evidenceStep?: string) {
  if (
    process.env.C3R_P_LOCAL_EVIDENCE_MODE === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    evidenceStep &&
    Object.hasOwn(EVIDENCE_TIMES, evidenceStep)
  ) {
    return EVIDENCE_TIMES[evidenceStep as keyof typeof EVIDENCE_TIMES];
  }
  return new Date().toISOString();
}

function plusDays(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}

function evidenceRef(issue: number, key: string) {
  return `${C3R_P_RUNTIME_ARTIFACT_REF}#${issue}:${key}`;
}

function requirePass(input: {
  claim: C3RPPracticeClaimInput;
  confirmedAt: string;
}) {
  const proof = evaluateC3RPPracticeClaim(input);
  if (!proof.evaluation.verified) throw new C3RPError("invalid_transition");
  return proof;
}

export function createC3RPService(authenticatedUserId: string) {
  const repository = createC3RPRepository(authenticatedUserId);

  async function view(recordId: string | null, asOf = now()): Promise<C3RPView> {
    const [restored, dashboard] = await Promise.all([
      recordId ? repository.restore(recordId) : Promise.resolve(null),
      repository.dashboard(asOf),
    ]);
    const latestPlan = dashboard.plans.find((plan) =>
      !recordId || plan.blocks.some((block) => block.recordId === recordId),
    ) ?? null;
    const currentPlan = latestPlan && !["REJECTED", "STALE"].includes(latestPlan.state)
      ? latestPlan
      : null;
    return {
      source: c3rPSourceView(),
      restored,
      dashboard,
      currentPlan,
    };
  }

  async function afterCommand(recordId: string, asOf: string) {
    return view(recordId, asOf);
  }

  async function applyReview(input: {
    action:
      | "record_assisted_review"
      | "complete_d1"
      | "complete_d7_transfer"
      | "complete_recurrence"
      | "complete_reopened_review"
      | "record_later_failure";
    recordId: string;
    expectedVersion: number;
    commandId: string;
    attemptId: string;
    claim: C3RPPracticeClaimInput;
    planBlockId?: string | null;
    evidenceStep?: string;
  }) {
    const occurredAt = now(input.evidenceStep);
    const proof = evaluateC3RPPracticeClaim({
      claim: input.claim,
      confirmedAt: occurredAt,
    });
    if (input.action === "record_later_failure") {
      if (proof.evaluation.verified) throw new C3RPError("invalid_transition");
    } else if (!proof.evaluation.verified) {
      throw new C3RPError("invalid_transition");
    }
    await repository.applyLearningCommand({
      commandId: input.commandId,
      expectedVersion: input.expectedVersion,
      action: input.action,
      payload: {
        recordId: input.recordId,
        attemptId: input.attemptId,
        attemptBody: proof.canonicalSentence,
        itemId:
          input.action === "complete_d7_transfer"
            ? C3R_P_SOURCE.transferItemId
            : C3R_P_SOURCE.itemId,
        surfaceId: input.action === "complete_d7_transfer"
          ? TRANSFER_SURFACE_ID
          : PRIMARY_SURFACE_ID,
        configurationDigest: FROZEN_CONFIGURATION_DIGEST,
        occurredAt,
        validatorId: C3R_P_VALIDATOR_ID,
        proofDigest: proof.proofDigest,
        ...(C3R_P_PLAN_COMPLETION_ACTIONS.has(input.action)
          ? { planBlockId: input.planBlockId ?? null }
          : {}),
      },
    });
    return afterCommand(input.recordId, occurredAt);
  }

  return {
    view,

    async start(input: {
      commandId: string;
      recordId: string;
      attemptId: string;
      attemptBody: string;
      prediction: "likely_success" | "likely_partial" | "likely_blocked";
      confidence: "low" | "medium" | "high";
      evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      await repository.applyLearningCommand({
        commandId: input.commandId,
        expectedVersion: 0,
        action: "start",
        payload: {
          recordId: input.recordId,
          attemptId: input.attemptId,
          attemptBody: input.attemptBody,
          prediction: input.prediction,
          confidence: input.confidence,
          surfaceId: PRIMARY_SURFACE_ID,
          configurationSnapshot: FROZEN_CONFIGURATION,
          configurationDigest: FROZEN_CONFIGURATION_DIGEST,
          occurredAt,
          sourceId: C3R_P_SOURCE.sourceId,
          problemId: C3R_P_SOURCE.problemId,
          revisionId: C3R_P_SOURCE.revisionId,
          itemId: C3R_P_SOURCE.itemId,
          artifactId: C3R_P_SOURCE.artifactId,
        },
      });
      return afterCommand(input.recordId, occurredAt);
    },

    async commitFeedback(input: {
      commandId: string;
      recordId: string;
      expectedVersion: number;
      gapId: string;
      failureNoteId: string;
      assistanceEventId: string;
      failureNote: string;
      evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      const restored = await repository.restore(input.recordId);
      const initialAttempt = restored.attempts.find((attempt) => attempt.phase === "D0");
      if (!initialAttempt) throw new C3RPError("invalid_transition");
      const gap = c3rPBiggestGap(initialAttempt.body);
      await repository.applyLearningCommand({
        commandId: input.commandId,
        expectedVersion: input.expectedVersion,
        action: "commit_feedback",
        payload: {
          recordId: input.recordId,
          gapId: input.gapId,
          failureNoteId: input.failureNoteId,
          assistanceEventId: input.assistanceEventId,
          failureNote: input.failureNote,
          assistanceKind: "BIGGEST_GAP",
          conceptId: gap.conceptId,
          evidenceRef: evidenceRef(707, "BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION"),
          configurationDigest: FROZEN_CONFIGURATION_DIGEST,
          occurredAt,
          d1DueAt: plusDays(occurredAt, 1),
          d7DueAt: plusDays(occurredAt, 7),
          recurrenceDueAt: plusDays(occurredAt, 10),
        },
      });
      return {
        view: await afterCommand(input.recordId, occurredAt),
        scaffold: c3rPSourceView().scaffold,
        biggestGapReasonCode: gap.reasonCode,
      };
    },

    async submitRepair(input: {
      commandId: string;
      recordId: string;
      expectedVersion: number;
      attemptId: string;
      claim: C3RPPracticeClaimInput;
      evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      const proof = requirePass({ claim: input.claim, confirmedAt: occurredAt });
      await repository.applyLearningCommand({
        commandId: input.commandId,
        expectedVersion: input.expectedVersion,
        action: "submit_repair",
        payload: {
          recordId: input.recordId,
          attemptId: input.attemptId,
          attemptBody: proof.canonicalSentence,
          configurationDigest: FROZEN_CONFIGURATION_DIGEST,
          occurredAt,
          validatorId: C3R_P_VALIDATOR_ID,
          proofDigest: proof.proofDigest,
        },
      });
      return {
        view: await afterCommand(input.recordId, occurredAt),
        canonicalSentence: proof.canonicalSentence,
      };
    },

    applyReview,

    async createPlan(input: {
      commandId: string;
      recordId: string;
      planId: string;
      kind: "TODAY" | "FULL_DAY";
      availableMinutes: number;
      evidenceStep?: string;
    }) {
      const asOf = now(input.evidenceStep);
      const dashboard = await repository.dashboard(asOf);
      const planned = buildC3RPPlan({
        dashboard,
        availableMinutes: input.availableMinutes,
        idFactory: () => crypto.randomUUID(),
      });
      const result = await repository.createPlan({
        commandId: input.commandId,
        planId: input.planId,
        kind: input.kind,
        availableMinutes: input.availableMinutes,
        asOf,
        blocks: planned.blocks,
      });
      if (result.state !== "PROPOSED") {
        throw new C3RPError("invalid_transition");
      }
      return {
        ...(await view(input.recordId, asOf)),
        currentPlan: {
          planId: input.planId,
          planKind: input.kind,
          recordVersion: result.recordVersion,
          eligibilityDigest:
            result.eligibilityDigest ?? dashboard.eligibilityDigest,
          state: result.state,
          blocks: planned.blocks.map((block) => ({
            ...block,
            executionState: "PENDING" as const,
          })),
          dayComplete: planned.dayComplete && !planned.supportWorkRemaining,
        },
      } satisfies C3RPView;
    },

    async decidePlan(input: {
      commandId: string;
      recordId: string;
      planId: string;
      expectedVersion: number;
      decision: "ACCEPT" | "EDIT" | "REJECT";
      blocks: readonly C3RPPlanBlockInput[] | null;
      evidenceStep?: string;
    }) {
      const asOf = now(input.evidenceStep);
      await repository.decidePlan({ ...input, asOf });
      return view(input.recordId, asOf);
    },

    exportData: () => repository.exportData(),
    deleteData: () => repository.deleteData(),
  };
}
