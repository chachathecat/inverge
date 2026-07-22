import crypto from "node:crypto";

import {
  ownerAlphaCalculationReleaseBlockers,
  validateOwnerAlphaCalculationGraph,
} from "./owner-alpha-calculation-validator";
import { compileOwnerAlphaPracticeProblem } from "./owner-alpha-practice-compiler";
import {
  OWNER_ALPHA_PRACTICE_CONTRACT_VERSION,
  toOwnerAlphaPracticeView,
  type OwnerAlphaAssistanceLevel,
  type OwnerAlphaBiggestGap,
  type OwnerAlphaClaimState,
  type OwnerAlphaMisconceptionGraph,
  type OwnerAlphaPracticeSession,
  type OwnerAlphaPracticeVariant,
  type OwnerAlphaPracticeView,
  type OwnerAlphaQuestionReplayLink,
  type OwnerAlphaRootCauseCandidate,
} from "./owner-alpha-practice-contract";
import {
  OwnerAlphaProviderError,
  type OwnerAlphaPracticeProviderPort,
  type OwnerAlphaProviderFile,
  type OwnerAlphaReferenceDraft,
} from "./owner-alpha-practice-provider-contract";
import {
  ownerAlphaCompletionProjection,
  ownerAlphaStableUuid,
} from "./owner-alpha-practice-ids";
import type { OwnerAlphaPracticeRepositoryPort } from "./owner-alpha-practice-repository";
import {
  ownerAlphaSubjectReferenceReleaseBlockers,
} from "./owner-alpha-practice-subject-adapters";
import {
  ownerAlphaGapTypeForSubject,
  ownerAlphaRewriteModeForSubject,
  ownerAlphaSubjectFromSession,
  type OwnerAlphaPracticeSubject,
} from "./owner-alpha-subject-adapter-contract";

const MAX_PROBLEM_TEXT = 24_000;
const MAX_ATTEMPT_TEXT = 16_000;
const MAX_QUESTION_TEXT = 2_000;
const MAX_REWRITE_TEXT = 16_000;
const REFERENCE_LEASE_MS = 60_000;

export type OwnerAlphaPracticeRuntimeDependencies = {
  repository: OwnerAlphaPracticeRepositoryPort;
  provider: OwnerAlphaPracticeProviderPort;
  assertReferenceEntitlement: () => Promise<void>;
  now: () => Date;
  createId: () => string;
  userId: string;
};

export class OwnerAlphaPracticeRuntimeError extends Error {
  readonly code:
    | "invalid_input"
    | "session_not_found"
    | "invalid_transition"
    | "stale_record"
    | "provider_failed";
  readonly providerCode: OwnerAlphaProviderError["code"] | null;

  constructor(
    code:
      | "invalid_input"
      | "session_not_found"
      | "invalid_transition"
      | "stale_record"
      | "provider_failed",
    providerCode: OwnerAlphaProviderError["code"] | null = null,
  ) {
    super(`owner-alpha-practice-runtime:${code}`);
    this.code = code;
    this.providerCode = providerCode;
  }
}

function boundedText(value: string, max: number, min = 1) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (normalized.length < min || normalized.length > max) {
    throw new OwnerAlphaPracticeRuntimeError("invalid_input");
  }
  return normalized;
}

function boundedElapsed(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), 8 * 60 * 60 * 1_000));
}

function appendQuestion(
  session: OwnerAlphaPracticeSession,
  text: string | null,
  occurredAt: string,
) {
  if (!text?.trim()) return session.questionChain;
  const questionText = boundedText(text, MAX_QUESTION_TEXT);
  const entries = session.questionChain.entries;
  return {
    ...session.questionChain,
    entries: [
      ...entries,
      {
        questionId: crypto.randomUUID(),
        parentQuestionId: entries.at(-1)?.questionId ?? null,
        sequence: entries.length + 1,
        kind: entries.length === 0 ? ("learner_question" as const) : ("follow_up" as const),
        questionText,
        occurredAt,
      },
    ],
  };
}

function fallbackLearningEvidence(
  session: OwnerAlphaPracticeSession,
): {
  biggestGap: OwnerAlphaBiggestGap;
  misconceptionGraph: OwnerAlphaMisconceptionGraph;
  rootCauseCandidates: OwnerAlphaRootCauseCandidate[];
  variant: OwnerAlphaPracticeVariant;
} {
  const subject = ownerAlphaSubjectFromSession(session);
  const practical = subject === "appraisal_practical";
  const theory = subject === "appraisal_theory";
  const conceptId = practical
    ? `method-${session.problemModel.methodFamily}`
    : `subject-${subject}-structure`;
  const title = practical
    ? "방법·산식 선택 근거 확인"
    : theory
      ? "정의·전제·논증 연결 확인"
      : "법적 근거·요건·포섭 연결 확인";
  const successCriteria = practical
    ? "적용 방법, 산식 선택 이유, 단위와 계산 순서를 자신의 말로 다시 설명합니다."
    : theory
      ? "정의에서 전제·논증·비교·평가·결론까지의 연결을 자신의 문장으로 다시 씁니다."
      : "쟁점, 법적 근거 후보, 요건별 사실, 포섭, 효과와 결론을 출처 상태와 함께 다시 씁니다.";
  const variantPrompt = practical
    ? "문제의 핵심 조건 하나가 반대로 바뀌었다고 가정하고, 적용 방법과 계산 순서가 어떻게 달라지는지 설명하세요."
    : theory
      ? "비교 대상 또는 전제 하나만 바꾸고 논증과 평가가 어떻게 달라지는지 빈 화면에서 다시 쓰세요."
      : "사실 또는 절차 조건 하나만 바꾸고 쟁점·근거·요건·포섭·결론을 다시 연결하세요.";
  return {
    biggestGap: {
      gapId: `${session.sessionId}-gap-unresolved`,
      title,
      reasonSelected: "AI 기준안 없이도 독립 시도에서 가장 불확실한 한 지점을 직접 확인합니다.",
      inferredMisunderstanding: "현재 근거만으로 실제 혼동 개념을 확정하지 않습니다.",
      successCriteria,
      conceptIds: [conceptId],
      state: "fallback_unresolved",
      gapType: ownerAlphaGapTypeForSubject(subject, null),
    },
    misconceptionGraph: {
      graphId: `${session.sessionId}-misconception`,
      nodes: [
        {
          conceptId,
          label: title,
          state: "unresolved",
          evidenceRefIds: [session.independentAttempt?.attemptId ?? session.sessionId],
        },
      ],
      edges: [],
    },
    rootCauseCandidates: [
      {
        rootCauseId: `${session.sessionId}-root-unresolved`,
        label: "근본 원인 확인 필요",
        rationale: "AI 장애 또는 근거 부족으로 장기 인과를 단정하지 않습니다.",
        confidence: "low",
        evidenceRefIds: [session.independentAttempt?.attemptId ?? session.sessionId],
        conceptIds: [conceptId],
        state: "candidate",
      },
    ],
    variant: {
      variantId: `${session.sessionId}-variant-1`,
      kind: "condition",
      changedOneThing: "핵심 조건 하나를 반대로 바꿈",
      prompt: variantPrompt,
      verificationState: "unresolved_needs_review",
      calculationGraph: { nodes: [] },
    },
  };
}

function checksAppliedClaims(
  claims: OwnerAlphaClaimState[],
  checks: ReturnType<typeof validateOwnerAlphaCalculationGraph>,
  nodes: OwnerAlphaPracticeSession["problemModel"]["calculationGraph"]["nodes"],
  problemModel: OwnerAlphaPracticeSession["problemModel"],
) {
  const subject = problemModel.subjectAdapter?.subject ?? "appraisal_practical";
  const byNode = new Map(checks.map((check) => [check.nodeId, check]));
  const nodeByClaim = new Map(
    nodes
      .filter((node) => node.claimId)
      .map((node) => [node.claimId as string, node.nodeId]),
  );
  const dedupedClaims = [...new Map(claims.map((claim) => [claim.claimId, claim])).values()];
  const normalized = dedupedClaims.map((claim): OwnerAlphaClaimState => {
    if (
      subject === "appraisal_practical" &&
      problemModel.methodFamily === "mixed_or_uncertain" &&
      claim.claimType === "method"
    ) {
      return {
        ...claim,
        state: "unresolved_needs_review",
        resolutionCode: "multiple_reasonable_approaches",
      };
    }
    const calculationNodeId =
      claim.calculationNodeId ?? nodeByClaim.get(claim.claimId) ?? null;
    if (!calculationNodeId) {
      return {
        ...claim,
        // Native core does not trust an AI adapter to self-promote provenance.
        state:
          claim.state === "unresolved_needs_review"
            ? "unresolved_needs_review"
            : "ai_inference",
        resolutionCode:
          claim.state === "unresolved_needs_review"
            ? claim.resolutionCode
            : "provider_only",
      };
    }
    const check = byNode.get(calculationNodeId);
    if (!check) {
      return {
        ...claim,
        calculationNodeId,
        state: "unresolved_needs_review",
        resolutionCode: "unsupported_primitive",
      };
    }
    if (check.status === "validated") {
      if (
        subject === "appraisal_theory" &&
        ["concept", "method", "source"].includes(claim.claimType)
      ) {
        return {
          ...claim,
          calculationNodeId,
          state: "ai_inference",
          resolutionCode: "provider_only",
        };
      }
      return {
        ...claim,
        calculationNodeId,
        state: "deterministically_validated",
        resolutionCode: "supported",
      };
    }
    return {
      ...claim,
      calculationNodeId,
      state: "unresolved_needs_review",
      resolutionCode:
        check.status === "conflict"
          ? "deterministic_conflict"
          : "unsupported_primitive",
      };
  });
  const representedNodes = new Set(
    normalized.map((claim) => claim.calculationNodeId).filter(Boolean),
  );
  for (const node of nodes) {
    if (representedNodes.has(node.nodeId)) continue;
    const check = byNode.get(node.nodeId);
    normalized.push({
      claimId: node.claimId ?? `claim-${node.nodeId}`,
      claimType: "formula",
      summary: node.label,
      state:
        check?.status === "validated"
          ? "deterministically_validated"
          : "unresolved_needs_review",
      critical: node.critical,
      evidenceRefIds: [],
      calculationNodeId: node.nodeId,
      resolutionCode:
        check?.status === "validated"
          ? "supported"
          : check?.status === "conflict"
            ? "deterministic_conflict"
            : "unsupported_primitive",
    });
  }
  return normalized;
}

function normalizeDraftWithChecks(
  draft: OwnerAlphaReferenceDraft,
  problemModel: OwnerAlphaPracticeSession["problemModel"],
) {
  const checks = validateOwnerAlphaCalculationGraph(
    draft.reference.calculationGraph,
  );
  const claims = checksAppliedClaims(
    draft.reference.claims,
    checks,
    draft.reference.calculationGraph.nodes,
    problemModel,
  );
  const blockerCodes = [
    ...ownerAlphaCalculationReleaseBlockers(checks),
    ...ownerAlphaSubjectReferenceReleaseBlockers({
      problemModel,
      claims,
      generatedReferenceText: JSON.stringify(draft),
    }),
    ...(claims.length === 0 ? ["reference:missing_claim_verification"] : []),
  ];
  const variantChecks = validateOwnerAlphaCalculationGraph(
    draft.variant.calculationGraph,
  );
  const variantVerificationState: OwnerAlphaPracticeVariant["verificationState"] =
    variantChecks.length > 0 &&
    variantChecks.every((check) => check.status === "validated")
      ? "deterministically_validated"
      : "unresolved_needs_review";
  return {
    ...draft,
    reference: {
      ...draft.reference,
      claims,
      releaseStatus: blockerCodes.length > 0 ? ("withheld" as const) : ("released" as const),
      blockerCodes,
    },
    variant: {
      ...draft.variant,
      verificationState: variantVerificationState,
    },
    checks,
  };
}

function isolateProviderClaimIds(
  nativeClaims: OwnerAlphaClaimState[],
  providerClaims: OwnerAlphaClaimState[],
) {
  const seen = new Set(nativeClaims.map((claim) => claim.claimId));
  return providerClaims.map((claim, index) => {
    let claimId = claim.claimId;
    while (seen.has(claimId)) claimId = `ai-${index + 1}-${claimId}`;
    seen.add(claimId);
    return claimId === claim.claimId ? claim : { ...claim, claimId };
  });
}

function evidenceConceptIds(session: OwnerAlphaPracticeSession) {
  return new Set([
    ...session.misconceptionGraph.nodes.map((node) => node.conceptId),
    ...session.rootCauseCandidates.flatMap((candidate) => candidate.conceptIds),
  ]);
}

function buildReplayLinks(
  current: OwnerAlphaPracticeSession,
  recent: OwnerAlphaPracticeSession[],
  createdAt: string,
) {
  const currentConcepts = evidenceConceptIds(current);
  const links: OwnerAlphaQuestionReplayLink[] = [];
  for (const prior of recent) {
    if (prior.sessionId === current.sessionId) continue;
    if (ownerAlphaSubjectFromSession(prior) !== ownerAlphaSubjectFromSession(current)) {
      continue;
    }
    const sharedConcepts = [...evidenceConceptIds(prior)].filter((conceptId) =>
      currentConcepts.has(conceptId),
    );
    const rootConcepts = new Set(
      current.rootCauseCandidates.flatMap((candidate) => candidate.conceptIds),
    );
    const basis =
      sharedConcepts.length > 0
        ? sharedConcepts.some((conceptId) => rootConcepts.has(conceptId))
          ? "root_cause"
          : "misconception"
        : prior.problemModel.methodFamily === current.problemModel.methodFamily
          ? "method_family"
          : null;
    if (!basis) continue;
    links.push({
      replayLinkId: ownerAlphaStableUuid(
        `${current.sessionId}:${prior.sessionId}:${basis}`,
      ),
      currentSessionId: current.sessionId,
      priorSessionId: prior.sessionId,
      basis,
      conceptIds: sharedConcepts.slice(0, 8),
      createdAt,
    });
    if (links.length === 5) break;
  }
  return links;
}

function levelForRequest(
  session: OwnerAlphaPracticeSession,
  revealFull: boolean,
): OwnerAlphaAssistanceLevel {
  if (revealFull) return 5;
  return Math.min(4, Math.max(1, session.assistance.assistanceLevel + 1)) as OwnerAlphaAssistanceLevel;
}

function revealExposure(level: OwnerAlphaAssistanceLevel) {
  if (level === 5) return "full" as const;
  return level > 0 ? ("hint" as const) : ("none" as const);
}

export class OwnerAlphaPracticeRuntime {
  private readonly deps: OwnerAlphaPracticeRuntimeDependencies;

  constructor(deps: OwnerAlphaPracticeRuntimeDependencies) {
    this.deps = deps;
  }

  private async requireSession(sessionId: string, expectedRecordVersion?: number) {
    const session = await this.deps.repository.load(sessionId);
    if (!session) throw new OwnerAlphaPracticeRuntimeError("session_not_found");
    if (
      expectedRecordVersion !== undefined &&
      session.recordVersion !== expectedRecordVersion
    ) {
      throw new OwnerAlphaPracticeRuntimeError("stale_record");
    }
    return session;
  }

  async create(input: {
    problemText: string;
    files: OwnerAlphaProviderFile[];
    inputModality: OwnerAlphaPracticeSession["assistance"]["inputModality"];
    subject?: OwnerAlphaPracticeSubject | null;
  }): Promise<OwnerAlphaPracticeView> {
    const suppliedText = input.problemText.trim().slice(0, MAX_PROBLEM_TEXT);
    if (!suppliedText && input.files.length === 0) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_input");
    }
    const sessionId = this.deps.createId();
    const now = this.deps.now().toISOString();
    let confirmedProblemText = suppliedText;
    let compileState: OwnerAlphaPracticeSession["providerState"]["compile"] =
      "deterministic_fallback";
    let compileModel: string | null = null;
    if (input.files.length > 0) {
      try {
        const extracted = await this.deps.provider.extractProblem({
          problemText: suppliedText,
          files: input.files,
          subject: input.subject ?? "appraisal_practical",
        });
        confirmedProblemText = extracted.extractedText;
        compileState = "succeeded";
        compileModel = extracted.modelProfileId;
      } catch (error) {
        if (!suppliedText) {
          const providerError =
            error instanceof OwnerAlphaProviderError
              ? error
              : new OwnerAlphaProviderError("unavailable");
          throw new OwnerAlphaPracticeRuntimeError(
            "provider_failed",
            providerError.code,
          );
        }
      }
    }
    confirmedProblemText = boundedText(
      confirmedProblemText,
      MAX_PROBLEM_TEXT,
      10,
    );
    const problemModel = compileOwnerAlphaPracticeProblem({
      problemId: sessionId,
      problemText: confirmedProblemText,
      subject: input.subject ?? "appraisal_practical",
    });
    const initialQuestion =
      problemModel.requirements.map((item) => item.text).join(" / ") ||
      confirmedProblemText.slice(0, MAX_QUESTION_TEXT);
    const session: OwnerAlphaPracticeSession = {
      contractVersion: OWNER_ALPHA_PRACTICE_CONTRACT_VERSION,
      sessionId,
      recordVersion: 1,
      status: "problem_compiled",
      subject: problemModel.subject,
      createdAt: now,
      updatedAt: now,
      problemModel,
      confirmedProblemText,
      criticalOcrConfirmed: false,
      independentAttempt: null,
      assistance: {
        assistanceLevel: 0,
        requestedByUser: false,
        hintIds: [],
        independentAttemptBeforeHelp: false,
        independentRecoveryAfterHelp: false,
        answerExposure: "none",
        revealHistory: [],
        elapsedTimeMs: 0,
        confidence: "unknown",
        inputModality: input.inputModality,
        variantFamilyId: null,
        variantDistance: null,
        sessionPosition: 1,
      },
      aiReference: null,
      calculationChecks: [],
      biggestGap: null,
      rewrite: null,
      fixedD1DueAt: null,
      variant: null,
      questionChain: {
        chainId: `${sessionId}-questions`,
        entries: [
          {
            questionId: `${sessionId}-question-1`,
            parentQuestionId: null,
            sequence: 1,
            kind: "learner_question",
            questionText: initialQuestion.slice(0, MAX_QUESTION_TEXT),
            occurredAt: now,
          },
        ],
      },
      misconceptionGraph: {
        graphId: `${sessionId}-misconception`,
        nodes: [],
        edges: [],
      },
      rootCauseCandidates: [],
      questionReplayLinks: [],
      providerState: {
        compile: compileState,
        reference: "not_requested",
        failureCode: null,
        modelProfileId: compileModel,
        referenceAttemptStartedAt: null,
        referenceLeaseExpiresAt: null,
      },
      links: {
        answerSubmissionId: null,
        rewriteSubmissionId: null,
        reviewQueueItemId: null,
        todayActionSeedId: null,
        learningRecordId: null,
      },
    };
    return toOwnerAlphaPracticeView(await this.deps.repository.create(session));
  }

  async get(sessionId: string) {
    return toOwnerAlphaPracticeView(await this.requireSession(sessionId));
  }

  async confirmProblem(input: {
    sessionId: string;
    recordVersion: number;
    confirmedProblemText: string;
  }) {
    const session = await this.requireSession(input.sessionId, input.recordVersion);
    if (session.status !== "problem_compiled" && session.status !== "problem_confirmed") {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    const confirmedProblemText = boundedText(
      input.confirmedProblemText,
      MAX_PROBLEM_TEXT,
      10,
    );
    const recompiledProblemModel = compileOwnerAlphaPracticeProblem({
      problemId: session.sessionId,
      problemText: confirmedProblemText,
      subject:
        session.problemModel.subjectAdapter?.subject ??
        ownerAlphaSubjectFromSession(session),
    });
    const problemModel = session.problemModel.subjectAdapter
      ? recompiledProblemModel
      : {
          ...recompiledProblemModel,
          subject: session.problemModel.subject,
          subjectAdapter: undefined,
        };
    const next: OwnerAlphaPracticeSession = {
      ...session,
      status: "problem_confirmed",
      criticalOcrConfirmed: true,
      confirmedProblemText,
      problemModel,
    };
    return toOwnerAlphaPracticeView(
      await this.deps.repository.save(next, input.recordVersion),
    );
  }

  async saveIndependentAttempt(input: {
    sessionId: string;
    recordVersion: number;
    attemptText: string;
    elapsedTimeMs: number;
    confidence: "low" | "medium" | "high";
  }) {
    const session = await this.requireSession(input.sessionId, input.recordVersion);
    if (session.status !== "problem_confirmed" || !session.criticalOcrConfirmed) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    const savedAt = this.deps.now().toISOString();
    const next: OwnerAlphaPracticeSession = {
      ...session,
      status: "attempt_saved",
      independentAttempt: {
        attemptId: `${session.sessionId}:independent-attempt`,
        text: boundedText(input.attemptText, MAX_ATTEMPT_TEXT, 10),
        elapsedTimeMs: boundedElapsed(input.elapsedTimeMs),
        confidence: input.confidence,
        savedAt,
      },
      assistance: {
        ...session.assistance,
        independentAttemptBeforeHelp: true,
        elapsedTimeMs: boundedElapsed(input.elapsedTimeMs),
        confidence: input.confidence,
      },
      links: {
        ...session.links,
        answerSubmissionId: `${session.sessionId}:independent-attempt`,
      },
    };
    const saved = await this.deps.repository.save(next, input.recordVersion);
    await this.deps.repository.saveIndependentAttempt(saved);
    return toOwnerAlphaPracticeView(saved);
  }

  async requestAssistance(input: {
    sessionId: string;
    recordVersion: number;
    questionText: string | null;
    revealFull: boolean;
  }): Promise<{ view: OwnerAlphaPracticeView; providerFailed: boolean }> {
    const session = await this.requireSession(input.sessionId, input.recordVersion);
    if (!session.independentAttempt || !session.criticalOcrConfirmed) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    if (
      session.status === "completed" ||
      session.status === "completion_pending"
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    const now = this.deps.now().toISOString();
    const referenceLeaseExpiresAt = Date.parse(
      session.providerState.referenceLeaseExpiresAt ?? "",
    );
    const retryingExpiredLease =
      session.providerState.reference === "generating" &&
      (!Number.isFinite(referenceLeaseExpiresAt) ||
        referenceLeaseExpiresAt <= Date.parse(now));
    if (
      session.providerState.reference === "generating" &&
      !retryingExpiredLease
    ) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    const level = retryingExpiredLease
      ? input.revealFull
        ? 5
        : (Math.max(
            1,
            session.assistance.assistanceLevel,
          ) as OwnerAlphaAssistanceLevel)
      : levelForRequest(session, input.revealFull);
    const exposure = revealExposure(level);
    const questionChain = appendQuestion(session, input.questionText, now);
    const assistance = {
      ...session.assistance,
      assistanceLevel: level,
      requestedByUser: true,
      answerExposure: exposure,
      revealHistory: [
        ...session.assistance.revealHistory,
        {
          eventId: this.deps.createId(),
          occurredAt: now,
          assistanceLevel: level,
          answerExposure: exposure,
          requestedByUser: true as const,
        },
      ],
    };

    if (session.aiReference) {
      const next = { ...session, assistance, questionChain };
      const saved = await this.deps.repository.save(next, input.recordVersion);
      if (saved.providerState.reference === "succeeded") {
        await this.deps.repository.recordReferenceUsage(saved);
      }
      return { view: toOwnerAlphaPracticeView(saved), providerFailed: false };
    }

    // Claim the next record version before provider work. Concurrent stale
    // requests fail CAS here and cannot duplicate a model call.
    const claimed = await this.deps.repository.save(
      {
        ...session,
        status: "reference_generating",
        assistance,
        questionChain,
        providerState: {
          ...session.providerState,
          reference: "generating",
          failureCode: null,
          referenceAttemptStartedAt: now,
          referenceLeaseExpiresAt: new Date(
            Date.parse(now) + REFERENCE_LEASE_MS,
          ).toISOString(),
        },
      },
      input.recordVersion,
    );
    let draft: OwnerAlphaReferenceDraft;
    try {
      await this.deps.assertReferenceEntitlement();
      draft = await this.deps.provider.generateReference({
        sessionId: claimed.sessionId,
        problemText: claimed.confirmedProblemText,
        problemModel: claimed.problemModel,
        independentAttempt: claimed.independentAttempt!.text,
        questionText: input.questionText,
        generatedAt: now,
      });
    } catch (error) {
      const providerError =
        error instanceof OwnerAlphaProviderError
          ? error
          : new OwnerAlphaProviderError("unavailable");
      const fallback = fallbackLearningEvidence(claimed);
      const failed: OwnerAlphaPracticeSession = {
        ...claimed,
        status: "reference_withheld",
        biggestGap: fallback.biggestGap,
        misconceptionGraph: fallback.misconceptionGraph,
        rootCauseCandidates: fallback.rootCauseCandidates,
        variant: fallback.variant,
        providerState: {
          ...claimed.providerState,
          reference: "failed_retryable",
          failureCode: providerError.code,
          referenceAttemptStartedAt: null,
          referenceLeaseExpiresAt: null,
        },
      };
      const recent = await this.deps.repository.listRecentSessions();
      failed.questionReplayLinks = buildReplayLinks(failed, recent, now);
      const saved = await this.deps.repository.save(
        failed,
        claimed.recordVersion,
      );
      return { view: toOwnerAlphaPracticeView(saved), providerFailed: true };
    }

    const checked = normalizeDraftWithChecks(
      draft,
      claimed.problemModel,
    );
    const isolatedClaims = isolateProviderClaimIds(
      claimed.problemModel.claimVerificationStates,
      checked.reference.claims,
    );
    const checkedReference = {
      ...checked.reference,
      claims: isolatedClaims,
    };
    const referenceReleased = checkedReference.releaseStatus === "released";
    const subjectAdapter = claimed.problemModel.subjectAdapter;
    const synchronizedSubjectAdapter =
      subjectAdapter?.adapter === "PracticalAdapter"
        ? {
            ...subjectAdapter,
            calculationGraphNodeIds: checkedReference.calculationGraph.nodes.map(
              (node) => node.nodeId,
            ),
          }
        : subjectAdapter;
    const prepared: OwnerAlphaPracticeSession = {
      ...claimed,
      status: referenceReleased ? "reference_ready" : "reference_withheld",
      aiReference: checkedReference,
      calculationChecks: checked.checks,
      biggestGap: checked.biggestGap,
      misconceptionGraph:
        checked.misconceptionGraph.nodes.length > 0
          ? checked.misconceptionGraph
          : fallbackLearningEvidence(claimed).misconceptionGraph,
      rootCauseCandidates: checked.rootCauseCandidates,
      variant: checked.variant,
      problemModel: {
        ...claimed.problemModel,
        calculationGraph: checked.reference.calculationGraph,
        subjectAdapter: synchronizedSubjectAdapter,
        claimVerificationStates: [
          ...claimed.problemModel.claimVerificationStates,
          ...isolatedClaims,
        ],
      },
      providerState: {
        ...claimed.providerState,
        reference: referenceReleased ? "succeeded" : "withheld",
        failureCode: null,
        modelProfileId: checkedReference.modelProfileId,
        referenceAttemptStartedAt: null,
        referenceLeaseExpiresAt: null,
      },
    };
    const recent = await this.deps.repository.listRecentSessions();
    prepared.questionReplayLinks = buildReplayLinks(prepared, recent, now);
    const saved = await this.deps.repository.save(
      prepared,
      claimed.recordVersion,
    );
    // The learner-owned native session is canonical. A stale provider response
    // must fail its CAS before it can create a success usage event.
    if (referenceReleased) {
      await this.deps.repository.recordReferenceUsage(saved);
    }
    return { view: toOwnerAlphaPracticeView(saved), providerFailed: false };
  }

  async completeRewrite(input: {
    sessionId: string;
    recordVersion: number;
    mode: "rewrite" | "recalculate";
    subjectMode?: string | null;
    rewriteText: string;
    inferredMisunderstanding: string;
    successCriteria: string;
  }) {
    const session = await this.requireSession(input.sessionId, input.recordVersion);
    if (!session.independentAttempt || !session.biggestGap || !session.variant) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    if (session.status === "completed") {
      return toOwnerAlphaPracticeView(session);
    }
    const projection = ownerAlphaCompletionProjection(
      this.deps.userId,
      session.sessionId,
    );
    let pending = session;
    if (session.status !== "completion_pending") {
      const nowDate = this.deps.now();
      const savedAt = nowDate.toISOString();
      const fixedD1DueAt = new Date(nowDate.getTime() + 86_400_000).toISOString();
      const variantQuestionId = `${session.sessionId}-variant-question`;
      const withoutDuplicateVariant = session.questionChain.entries.filter(
        (entry) => entry.questionId !== variantQuestionId,
      );
      const adapter = session.problemModel.subjectAdapter;
      const canonicalMode =
        adapter && adapter.subject !== "appraisal_practical"
          ? ("rewrite" as const)
          : input.mode;
      const subjectMode = adapter
        ? ownerAlphaRewriteModeForSubject(
            adapter,
            input.subjectMode,
            canonicalMode,
          )
        : undefined;
      const claimed: OwnerAlphaPracticeSession = {
        ...session,
        status: "completion_pending",
        biggestGap: {
          ...session.biggestGap,
          inferredMisunderstanding: boundedText(
            input.inferredMisunderstanding,
            1_200,
            3,
          ),
          successCriteria: boundedText(input.successCriteria, 1_200, 3),
          state: "learner_confirmed",
        },
        rewrite: {
          rewriteId: `${session.sessionId}:rewrite`,
          mode: canonicalMode,
          subjectMode,
          text: boundedText(input.rewriteText, MAX_REWRITE_TEXT, 10),
          savedAt,
        },
        fixedD1DueAt,
        questionChain: {
          ...session.questionChain,
          entries: [
            ...withoutDuplicateVariant,
            {
              questionId: variantQuestionId,
              parentQuestionId: withoutDuplicateVariant.at(-1)?.questionId ?? null,
              sequence: withoutDuplicateVariant.length + 1,
              kind: "variant",
              questionText: session.variant.prompt,
              occurredAt: savedAt,
            },
          ],
        },
        assistance: {
          ...session.assistance,
          independentRecoveryAfterHelp: true,
          variantFamilyId: session.variant.variantId,
          variantDistance: "near",
        },
        links: {
          ...session.links,
          rewriteSubmissionId: `${session.sessionId}:rewrite`,
          reviewQueueItemId: projection.reviewQueueItemId,
          todayActionSeedId: projection.todayActionSeedId,
          learningRecordId: projection.wrongAnswerItemId,
        },
      };
      pending = await this.deps.repository.save(claimed, input.recordVersion);
    }
    if (!pending.rewrite || !pending.fixedD1DueAt) {
      throw new OwnerAlphaPracticeRuntimeError("invalid_transition");
    }
    await this.deps.repository.saveRewrite(pending);
    await this.deps.repository.projectCompletion(pending, projection);
    return toOwnerAlphaPracticeView(
      await this.deps.repository.save(
        { ...pending, status: "completed" },
        pending.recordVersion,
      ),
    );
  }
}
