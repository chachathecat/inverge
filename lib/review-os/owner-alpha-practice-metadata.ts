import type { OwnerAlphaPracticeSession } from "./owner-alpha-practice-contract";
import { ownerAlphaSubjectFromSession } from "./owner-alpha-subject-adapter-contract";

/**
 * Bounded metadata projection for database derived payloads and telemetry.
 * Learner problem, attempt, reference, question, and rewrite bodies are
 * deliberately absent.
 */
export function ownerAlphaPracticeMetadataProjection(
  session: OwnerAlphaPracticeSession,
) {
  return {
    contractVersion: session.contractVersion,
    subjectAdapterContractVersion:
      session.problemModel.subjectAdapter?.contractVersion ?? null,
    explanationLadderContractVersion:
      session.aiReference?.explanationLadder?.contractVersion ?? null,
    explanationLadderPresent: Boolean(
      session.aiReference?.explanationLadder,
    ),
    explanationLadderBlockCount:
      session.aiReference?.explanationLadder?.blocks.length ?? 0,
    subject: ownerAlphaSubjectFromSession(session),
    secondaryDomains:
      session.problemModel.subjectAdapter?.secondaryDomains ?? [],
    problemType: session.problemModel.subjectAdapter?.problemType ?? null,
    recordVersion: session.recordVersion,
    status: session.status,
    methodFamily: session.problemModel.methodFamily,
    topicCount: session.problemModel.topicCandidates.length,
    claimStateCounts: Object.fromEntries(
      [
        "problem_given",
        "official_source_grounded",
        "deterministically_validated",
        "cross_checked_ai",
        "ai_inference",
        "unresolved_needs_review",
      ].map((state) => [
        state,
        session.problemModel.claimVerificationStates.filter(
          (claim) => claim.state === state,
        ).length,
      ]),
    ),
    criticalClaimCount: session.problemModel.claimVerificationStates.filter(
      (claim) => claim.critical,
    ).length,
    questionChainLength: session.questionChain.entries.length,
    misconceptionNodeCount: session.misconceptionGraph.nodes.length,
    misconceptionEdgeCount: session.misconceptionGraph.edges.length,
    rootCauseCandidateCount: session.rootCauseCandidates.length,
    replayLinkCount: session.questionReplayLinks.length,
    fixedD1DueAt: session.fixedD1DueAt,
    containsRawContent: false,
  };
}
