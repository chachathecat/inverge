import { FirstStageKernelError, requiredIdentifier, requiredUtcInstant } from "../kernel/domain";
import { selectQfI1BankFirstAssignmentV1, type QfI1CandidateV1 } from "../../../question-foundry/runtime/qf-i1-bank-first";
import { reviewedEconomicsBankCandidates } from "./private-reviewed-content";
import { createPrivateFirstStageSessionService, privateFirstStageSessionId, privateSessionDigest,
  type PrivateFirstStageCatalog, type PrivateFirstStageSession, type PrivateFirstStageSessionStore } from "./session-service";

export type ReviewedBankAssignment = Extract<ReturnType<typeof selectQfI1BankFirstAssignmentV1>, { status: "ASSIGNED" }>;
export type ReviewedBankRecord = Readonly<{ session: PrivateFirstStageSession; assignment: ReviewedBankAssignment }>;
export interface ReviewedBankStore {
  load(ownerId: string, sessionId: string): Promise<ReviewedBankRecord | null>;
  /** Atomic reservation + unchanged session payload in the SAME canonical row. */
  reserve(session: PrivateFirstStageSession, assignment: ReviewedBankAssignment): Promise<ReviewedBankRecord | null>;
}
function fail(code: FirstStageKernelError["code"] = "adapter_mismatch"): never { throw new FirstStageKernelError(code); }
const request = (scope: string, at: string, candidates: readonly QfI1CandidateV1[]) => ({
  purpose: "LEARNING_PRACTICE" as const, learnerScopeId: scope, sourceCandidateId: "reviewed-economics-initial",
  sourceFamilyId: "reviewed-economics-initial", sourceSurfaceId: "reviewed-economics-initial",
  asOf: at, candidates, exposures: [],
});

export function createReviewedBankService(sessions: PrivateFirstStageSessionStore, bank: ReviewedBankStore,
  catalog: PrivateFirstStageCatalog, now: () => string) {
  const service = createPrivateFirstStageSessionService(sessions, catalog, now);
  function stock() {
    const candidates = reviewedEconomicsBankCandidates(catalog);
    if (!candidates) fail();
    return candidates;
  }
  async function readWinner(ownerId: string, sessionId: string, winner: ReviewedBankRecord) {
    const history = service.projectHistory(winner.session, ownerId);
    if (history.sessionId !== sessionId || history.contentMode !== "first_stage.private_session.v1") fail();
    const assignedAt = requiredUtcInstant(winner.assignment.assignedAt);
    if (Date.parse(assignedAt) > Date.parse(now())) fail();
    const candidate = stock().find(item => item.candidateId === history.questionId);
    if (!candidate) fail();
    const expected = selectQfI1BankFirstAssignmentV1(request(sessionId, assignedAt, [candidate]));
    if (expected.status !== "ASSIGNED" || privateSessionDigest(expected) !== privateSessionDigest(winner.assignment)) fail();
    return service.view(ownerId, sessionId);
  }
  async function available(ownerId: string) {
    const candidates = stock();
    if (!sessions.listOwnerSnapshot) fail();
    const snapshot = await sessions.listOwnerSnapshot(ownerId, "first_stage.private_session.v1");
    if (!snapshot.complete) fail("stale_state");
    const reserved = new Set<string>();
    for (const value of snapshot.sessions) {
      if (value.ownerId !== ownerId || value.schemaVersion !== "first_stage.private_session.v1") fail();
      const reference = value.state.examCycle.questionReferences[0];
      if (reference?.subjectId !== "economics_principles") continue;
      // Validate complete aggregates before treating readiness, exposure or a
      // processed review as history. A ready reservation is NOT an exposure.
      reserved.add(service.projectHistory(value, ownerId).questionId);
    }
    return candidates.filter(item => !reserved.has(item.candidateId));
  }
  return {
    async availability(ownerId: string) {
      return { availableOriginals: (await available(ownerId)).length, authority: "LEARNING_ONLY" as const,
        providerExecutionAllowed: false as const, transferEvidence: false as const, measurementEvidence: false as const };
    },
    async assign(ownerId: string, inputId: string) {
      const requestId = `bank-${requiredIdentifier(inputId)}`;
      requiredIdentifier(requestId);
      const sessionId = privateFirstStageSessionId(ownerId, requestId);
      const existing = await bank.load(ownerId, sessionId);
      if (existing) return { status: "assigned" as const, view: await readWinner(ownerId, sessionId, existing) };
      if (await sessions.load(ownerId, sessionId)) {
        // The same-row insert may commit between our two reads. Distinguish
        // that durable winner from a manual request reusing this identity.
        const winner = await bank.load(ownerId, sessionId);
        if (winner) return { status: "assigned" as const, view: await readWinner(ownerId, sessionId, winner) };
        fail("invalid_transition");
      }
      const at = requiredUtcInstant(now());
      const selected = selectQfI1BankFirstAssignmentV1(request(sessionId, at, await available(ownerId)));
      if (selected.status !== "ASSIGNED") {
        // A concurrent identical request may have consumed the last original
        // after both initial reads, but before this complete history snapshot.
        const winner = await bank.load(ownerId, sessionId);
        if (winner) return { status: "assigned" as const, view: await readWinner(ownerId, sessionId, winner) };
        return { status: "no_available_stock" as const,
          providerExecutionAllowed: false as const, authority: "LEARNING_ONLY" as const };
      }
      // The actual production constructor creates the unchanged sealed session;
      // only its insert port is replaced by an atomic same-row reservation.
      const reserving = createPrivateFirstStageSessionService({ ...sessions,
        async create(value) {
          stock(); // Recheck expiry after potentially slow history reads.
          const saved = await bank.reserve(value, selected);
          if (!saved) fail("stale_state");
          await readWinner(ownerId, sessionId, saved);
          return saved.session;
        },
      }, catalog, now);
      try {
        await reserving.create(ownerId, { requestId, questionId: selected.candidateId });
      } catch (error) {
        // Another identical request may have sealed a different initial choice
        // before our history snapshot, or the response may be lost AFTER commit.
        // Recover only an actually durable, fully revalidated same-request winner.
        const winner = await bank.load(ownerId, sessionId);
        if (!winner) throw error;
        return { status: "assigned" as const, view: await readWinner(ownerId, sessionId, winner) };
      }
      const saved = await bank.load(ownerId, sessionId);
      if (!saved) fail();
      return { status: "assigned" as const, view: await readWinner(ownerId, sessionId, saved) };
    },
  };
}
