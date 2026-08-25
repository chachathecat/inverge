import "server-only";

import crypto from "node:crypto";

import { getServerSessionUser, type InvergeServerSession } from "@/lib/auth/session";

import {
  C3R_T_FEATURE_FLAG,
  C3R_T_OWNER_ALLOWLIST,
  C3R_T_PLAN_COMPLETION_ACTIONS,
  C3R_T_RUNTIME_ARTIFACT_REF,
  C3R_T_VALIDATOR_ID,
  C3RTError,
  type C3RTPlanBlockInput,
  type C3RTPersistedPlan,
  type C3RTTheoryClaimInput,
  type C3RTView,
} from "./c3r-t-contract";
import {
  C3R_T_SOURCE,
  C3R_T_TRANSFER_TASK,
  buildC3RTPlan,
  c3rTBiggestGap,
  c3rTSha256,
  c3rTSourceView,
  c3rTTransferTaskId,
  evaluateC3RTTheoryClaim,
} from "./c3r-t-engine";
import { createC3RTRepository } from "./c3r-t-repository";

const EVIDENCE_TIMES = Object.freeze({
  d0: "2026-08-25T00:00:00.000Z",
  feedback: "2026-08-25T00:05:00.000Z",
  d1: "2026-08-26T00:06:00.000Z",
  d1Fresh: "2026-08-26T00:08:00.000Z",
  d1Rescheduled: "2026-08-27T00:09:00.000Z",
  d7: "2026-09-01T00:06:00.000Z",
  recurrence: "2026-09-04T00:06:00.000Z",
  reopen: "2026-09-05T00:06:00.000Z",
  plan: "2026-09-05T00:07:00.000Z",
  planToday: "2026-09-05T00:07:00.000Z",
  planFullDay: "2026-09-05T00:08:00.000Z",
  reopenComplete: "2026-09-05T00:09:00.000Z",
});
const PRIMARY_SURFACE_ID = "server:theory-primary-v1" as const;
const FROZEN_CONFIGURATION = Object.freeze({
  answerReviewPolicyVersion: "c3r-t-theory-review@1",
  assistancePolicyVersion: "c3r-t-smallest-scaffold@1",
  contentReleaseArtifactVersion: C3R_T_SOURCE.artifactId,
  ledgerSchemaVersion: "c3r-t-ledger@1",
  measurementPolicyVersion: "c3r-t-independent-qualification@1",
  modelVersion: "none:deterministic-structured-theory@1",
  promptVersion: "trusted-repair-fixture:appraisal-theory@1",
  rubricVersion: "scoped-predicate-anchor@1",
  schedulerPolicyVersion: "c3r-t-due-review@1",
  validatorVersion: C3R_T_VALIDATOR_ID,
});
const FROZEN_CONFIGURATION_DIGEST = c3rTSha256(FROZEN_CONFIGURATION);

function emails(value: string | undefined) {
  return (value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}
function productionDenied() {
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview" &&
    process.env.C3R_T_LOCAL_EVIDENCE_MODE !== "true";
}
function isOwner(email: string | null) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return emails(process.env.ALPHA_ADMIN_EMAILS).includes(normalized) &&
    emails(process.env[C3R_T_OWNER_ALLOWLIST]).includes(normalized);
}

export async function requireC3RTAccess(): Promise<InvergeServerSession & { userId: string }> {
  if (process.env[C3R_T_FEATURE_FLAG] !== "true") throw new C3RTError("feature_disabled");
  if (productionDenied()) throw new C3RTError("production_denied");
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) throw new C3RTError("auth_required");
  if (!isOwner(session.email)) throw new C3RTError("owner_required");
  return { ...session, userId: session.userId };
}

function now(evidenceStep?: string) {
  if (process.env.C3R_T_LOCAL_EVIDENCE_MODE === "true" &&
    process.env.VERCEL_ENV !== "production" && evidenceStep &&
    Object.hasOwn(EVIDENCE_TIMES, evidenceStep)) {
    return EVIDENCE_TIMES[evidenceStep as keyof typeof EVIDENCE_TIMES];
  }
  return new Date().toISOString();
}
function plusDays(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}
function deterministicUuid(identity: string) {
  const bytes = crypto.createHash("sha256").update(identity).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function evidenceRef(issue: number, key: string) {
  return `${C3R_T_RUNTIME_ARTIFACT_REF}#${issue}:${key}`;
}
function requirePass(input: { claim: C3RTTheoryClaimInput; confirmedAt: string }) {
  const proof = evaluateC3RTTheoryClaim(input);
  if (!proof.evaluation.verified) throw new C3RTError("invalid_transition");
  return proof;
}
function compareCurrentPlans(left: C3RTPersistedPlan, right: C3RTPersistedPlan) {
  return right.generatedAt.localeCompare(left.generatedAt) || left.planId.localeCompare(right.planId);
}
function comparePlanHistory(left: C3RTPersistedPlan, right: C3RTPersistedPlan) {
  return right.updatedAt.localeCompare(left.updatedAt) ||
    right.generatedAt.localeCompare(left.generatedAt) || left.planId.localeCompare(right.planId);
}

export function createC3RTService(authenticatedUserId: string) {
  const repository = createC3RTRepository(authenticatedUserId);

  async function view(recordId: string | null, asOf = now()): Promise<C3RTView> {
    const resolvedRecordId = recordId ?? await repository.findRecordId(C3R_T_SOURCE);
    const [restored, dashboard] = await Promise.all([
      resolvedRecordId ? repository.restore(resolvedRecordId) : Promise.resolve(null),
      repository.dashboard(asOf),
    ]);
    const currentReviewPhase = restored?.record.state === "REPAIRED" ? "D1"
      : restored?.record.state === "D1_COMPLETE" ? "D7_TRANSFER"
        : restored?.record.state === "D7_COMPLETE" ? "RECURRENCE"
          : restored?.record.state === "REOPENED" ? "REOPENED_REVIEW" : null;
    const { plans, ...dashboardProjection } = dashboard;
    const currentPlan = resolvedRecordId && restored?.record.primary_gap_id && currentReviewPhase
      ? [...plans].sort(compareCurrentPlans).find((plan) =>
          plan.completionState === "ACTIONABLE" && plan.terminalReason === null &&
          ["PROPOSED", "ACCEPTED", "EDITED"].includes(plan.state) &&
          plan.blocks.some((block) => block.recordId === resolvedRecordId &&
            block.gapId === restored.record.primary_gap_id &&
            block.reviewPhase === currentReviewPhase && block.executionState === "PENDING")) ?? null
      : null;
    return {
      source: c3rTSourceView(), restored, dashboard: dashboardProjection, currentPlan,
      planHistory: plans.filter((plan) => plan.terminalReason !== null).sort(comparePlanHistory),
    };
  }

  async function applyReview(input: {
    action: "record_assisted_review" | "complete_d1" | "complete_d7_transfer" |
      "complete_recurrence" | "complete_reopened_review" | "record_later_failure";
    recordId: string; expectedVersion: number; commandId: string; attemptId: string;
    claim: C3RTTheoryClaimInput; planBlockId?: string | null; planId?: string | null;
    planVersion?: number | null; transferTaskId?: string; evidenceStep?: string;
  }) {
    const occurredAt = now(input.evidenceStep);
    const expectedTransferTaskId = c3rTTransferTaskId(input.recordId);
    if (input.action === "complete_d7_transfer" && input.transferTaskId !== expectedTransferTaskId) {
      throw new C3RTError("invalid_transition");
    }
    const proof = evaluateC3RTTheoryClaim({ claim: input.claim, confirmedAt: occurredAt });
    if (input.action === "record_later_failure") {
      if (proof.evaluation.verified) throw new C3RTError("invalid_transition");
    } else if (!proof.evaluation.verified) {
      throw new C3RTError("invalid_transition");
    }
    await repository.applyLearningCommand({
      commandId: input.commandId, expectedVersion: input.expectedVersion, action: input.action,
      payload: {
        recordId: input.recordId, attemptId: input.attemptId,
        claim: input.claim,
        itemId: input.action === "complete_d7_transfer"
          ? C3R_T_TRANSFER_TASK.itemId : C3R_T_SOURCE.itemId,
        surfaceId: input.action === "complete_d7_transfer"
          ? C3R_T_TRANSFER_TASK.surfaceId : PRIMARY_SURFACE_ID,
        configurationDigest: FROZEN_CONFIGURATION_DIGEST, occurredAt,
        ...(input.action === "complete_d1" ? { transferTaskId: expectedTransferTaskId } : {}),
        ...(input.action === "complete_d7_transfer" ? { transferTaskId: input.transferTaskId } : {}),
        ...(C3R_T_PLAN_COMPLETION_ACTIONS.has(input.action) ? {
          planBlockId: input.planBlockId ?? null,
          planId: input.planId ?? null,
          planVersion: input.planVersion ?? null,
        } : {}),
      },
    });
    return view(input.recordId, occurredAt);
  }

  return {
    view,
    viewAtEvidenceStep(recordId: string | null, evidenceStep: string) {
      return view(recordId, now(evidenceStep));
    },
    async start(input: {
      commandId: string; recordId: string; attemptId: string; attemptBody: string;
      prediction: "likely_success" | "likely_partial" | "likely_blocked";
      confidence: "low" | "medium" | "high"; evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      await repository.applyLearningCommand({
        commandId: input.commandId, expectedVersion: 0, action: "start",
        payload: {
          recordId: input.recordId, attemptId: input.attemptId, attemptBody: input.attemptBody,
          prediction: input.prediction, confidence: input.confidence,
          surfaceId: PRIMARY_SURFACE_ID, configurationSnapshot: FROZEN_CONFIGURATION,
          configurationDigest: FROZEN_CONFIGURATION_DIGEST, occurredAt,
          sourceId: C3R_T_SOURCE.sourceId, problemId: C3R_T_SOURCE.problemId,
          revisionId: C3R_T_SOURCE.revisionId, itemId: C3R_T_SOURCE.itemId,
          artifactId: C3R_T_SOURCE.artifactId,
        },
      });
      return view(input.recordId, occurredAt);
    },
    async commitFeedback(input: {
      commandId: string; recordId: string; expectedVersion: number; gapId: string;
      failureNoteId: string; assistanceEventId: string; failureNote: string; evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      const restored = await repository.restore(input.recordId);
      const initialAttempt = restored.attempts.find((attempt) => attempt.phase === "D0");
      if (!initialAttempt) throw new C3RTError("invalid_transition");
      const gap = c3rTBiggestGap(initialAttempt.body);
      await repository.applyLearningCommand({
        commandId: input.commandId, expectedVersion: input.expectedVersion,
        action: "commit_feedback",
        payload: {
          recordId: input.recordId, gapId: input.gapId,
          failureNoteId: input.failureNoteId, assistanceEventId: input.assistanceEventId,
          failureNote: input.failureNote, assistanceKind: "BIGGEST_GAP",
          conceptId: gap.conceptId,
          evidenceRef: evidenceRef(707, "BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION"),
          configurationDigest: FROZEN_CONFIGURATION_DIGEST, occurredAt,
          d1DueAt: plusDays(occurredAt, 1), d7DueAt: plusDays(occurredAt, 7),
          recurrenceDueAt: plusDays(occurredAt, 10),
        },
      });
      return {
        view: await view(input.recordId, occurredAt), scaffold: c3rTSourceView().scaffold,
        biggestGapReasonCode: gap.reasonCode,
      };
    },
    async submitRepair(input: {
      commandId: string; recordId: string; expectedVersion: number; attemptId: string;
      claim: C3RTTheoryClaimInput; evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      const proof = requirePass({ claim: input.claim, confirmedAt: occurredAt });
      await repository.applyLearningCommand({
        commandId: input.commandId, expectedVersion: input.expectedVersion, action: "submit_repair",
        payload: {
          recordId: input.recordId, attemptId: input.attemptId,
          claim: input.claim,
          configurationDigest: FROZEN_CONFIGURATION_DIGEST, occurredAt,
        },
      });
      return { view: await view(input.recordId, occurredAt), canonicalSentence: proof.canonicalSentence };
    },
    applyReview,
    async presentD7TransferTask(input: {
      commandId: string; recordId: string; expectedVersion: number;
      transferTaskId: string; evidenceStep?: string;
    }) {
      const occurredAt = now(input.evidenceStep);
      if (input.transferTaskId !== c3rTTransferTaskId(input.recordId)) {
        throw new C3RTError("invalid_transition");
      }
      await repository.applyLearningCommand({
        commandId: input.commandId, expectedVersion: input.expectedVersion,
        action: "present_d7_transfer_task",
        payload: {
          recordId: input.recordId, transferTaskId: input.transferTaskId,
          configurationDigest: FROZEN_CONFIGURATION_DIGEST, occurredAt,
        },
      });
      return view(input.recordId, occurredAt);
    },
    async createPlan(input: {
      commandId: string; recordId: string; planId: string; kind: "TODAY" | "FULL_DAY";
      availableMinutes: number; evidenceStep?: string;
    }) {
      const asOf = now(input.evidenceStep);
      const dashboard = await repository.dashboard(asOf);
      let blockOrdinal = 0;
      const planned = buildC3RTPlan({
        dashboard, availableMinutes: input.availableMinutes,
        idFactory: () => deterministicUuid(
          `c3r-t-plan-block-v1:${input.planId}:${blockOrdinal += 1}`,
        ),
      });
      const result = await repository.createPlan({
        commandId: input.commandId, planId: input.planId, kind: input.kind,
        availableMinutes: input.availableMinutes, asOf, blocks: planned.blocks,
      });
      if (result.state !== "PROPOSED") throw new C3RTError("invalid_transition");
      const projected = await view(input.recordId, asOf);
      if (projected.currentPlan?.planId !== input.planId ||
        projected.currentPlan.state !== "PROPOSED" ||
        projected.currentPlan.recordVersion !== result.recordVersion) {
        throw new C3RTError("temporarily_unavailable");
      }
      return projected;
    },
    async decidePlan(input: {
      commandId: string; recordId: string; planId: string; expectedVersion: number;
      decision: "ACCEPT" | "EDIT" | "REJECT";
      blocks: readonly C3RTPlanBlockInput[] | null; evidenceStep?: string;
    }) {
      const asOf = now(input.evidenceStep);
      await repository.decidePlan({ ...input, asOf });
      return view(input.recordId, asOf);
    },
    exportData: () => repository.exportData(),
    deleteData: () => repository.deleteData(),
  };
}
