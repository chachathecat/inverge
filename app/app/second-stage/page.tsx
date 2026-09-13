import { notFound } from "next/navigation";

import { SecondStageOwnerHome } from "@/components/review-os/second-stage-owner-home";
import {
  C3RPError,
  type C3RPView,
} from "@/lib/review-os/c3r-p-contract";
import { createC3RPService, requireC3RPAccess } from "@/lib/review-os/c3r-p-service";
import {
  C3RTError,
  type C3RTView,
} from "@/lib/review-os/c3r-t-contract";
import { createC3RTService, requireC3RTAccess } from "@/lib/review-os/c3r-t-service";
import {
  C3RLError,
  type C3RLView,
} from "@/lib/review-os/c3r-l-contract";
import { createC3RLService, requireC3RLAccess } from "@/lib/review-os/c3r-l-service";
import {
  buildSecondStageOwnerHome,
  type SecondStageOwnerRecordState,
  type SecondStageOwnerReviewPhase,
  type SecondStageOwnerRuntimeSnapshot,
  type SecondStageOwnerSubjectId,
} from "@/lib/review-os/second-stage-owner-home";

export const dynamic = "force-dynamic";

type C3RView = C3RPView | C3RTView | C3RLView;
type C3RKnownError = C3RPError | C3RTError | C3RLError;

function knownError(error: unknown): C3RKnownError | null {
  return error instanceof C3RPError ||
    error instanceof C3RTError ||
    error instanceof C3RLError
    ? error
    : null;
}

function snapshotFromView(
  subjectId: SecondStageOwnerSubjectId,
  view: C3RView,
): SecondStageOwnerRuntimeSnapshot {
  return {
    subjectId,
    readState: "ready",
    record: view.restored
      ? {
          id: view.restored.record.id,
          state: view.restored.record.state as SecondStageOwnerRecordState,
          updatedAt: view.restored.record.updated_at,
        }
      : null,
    queue: view.dashboard.queue.map((item) => ({
      recordId: item.recordId,
      reviewPhase: item.reviewPhase as SecondStageOwnerReviewPhase,
      dueAt: item.dueAt,
      eligible: item.eligible,
      gapState: item.gapState,
    })),
  };
}

async function readSubject(
  subjectId: SecondStageOwnerSubjectId,
  access: () => Promise<{ userId: string }>,
  read: (userId: string) => Promise<C3RView>,
): Promise<SecondStageOwnerRuntimeSnapshot> {
  let owner;
  try {
    owner = await access();
  } catch (error) {
    const code = knownError(error)?.code;
    if (["feature_disabled", "production_denied", "auth_required", "owner_required", "not_found"].includes(code ?? "")) {
      return { subjectId, readState: "unavailable", record: null, queue: [] };
    }
    throw error;
  }
  try {
    return snapshotFromView(subjectId, await read(owner.userId));
  } catch (error) {
    if (["temporarily_unavailable", "not_found"].includes(knownError(error)?.code ?? "")) {
      return { subjectId, readState: "error", record: null, queue: [] };
    }
    throw error;
  }
}

export default async function SecondStageOwnerPage() {
  const snapshots = await Promise.all([
    readSubject("practice", requireC3RPAccess, (userId) =>
      createC3RPService(userId).view(null),
    ),
    readSubject("theory", requireC3RTAccess, (userId) =>
      createC3RTService(userId).view(null),
    ),
    readSubject("law", requireC3RLAccess, (userId) =>
      createC3RLService(userId).view(null),
    ),
  ]);
  if (snapshots.every((snapshot) => snapshot.readState === "unavailable")) {
    notFound();
  }
  return <SecondStageOwnerHome view={buildSecondStageOwnerHome(snapshots)} />;
}
