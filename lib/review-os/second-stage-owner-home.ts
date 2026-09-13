export const SECOND_STAGE_OWNER_SUBJECTS = Object.freeze([
  {
    id: "practice",
    label: "감정평가실무",
    shortLabel: "실무",
    href: "/app/c3r-p",
  },
  {
    id: "theory",
    label: "감정평가이론",
    shortLabel: "이론",
    href: "/app/c3r-t",
  },
  {
    id: "law",
    label: "감정평가 및 보상법규",
    shortLabel: "법규",
    href: "/app/c3r-l",
  },
] as const);

export type SecondStageOwnerSubjectId =
  (typeof SECOND_STAGE_OWNER_SUBJECTS)[number]["id"];

export type SecondStageOwnerRecordState =
  | "D0_OPEN"
  | "FEEDBACK_COMMITTED"
  | "REPAIRED"
  | "D1_COMPLETE"
  | "D7_COMPLETE"
  | "CLOSED"
  | "REOPENED";

export type SecondStageOwnerReviewPhase =
  | "D1"
  | "D7_TRANSFER"
  | "RECURRENCE"
  | "REOPENED_REVIEW";

export type SecondStageOwnerRuntimeSnapshot = Readonly<{
  subjectId: SecondStageOwnerSubjectId;
  readState: "unavailable" | "ready" | "error";
  record: Readonly<{
    id: string;
    state: SecondStageOwnerRecordState;
    updatedAt: string;
  }> | null;
  queue: readonly Readonly<{
    recordId: string;
    reviewPhase: SecondStageOwnerReviewPhase;
    dueAt: string;
    eligible: boolean;
    gapState: "OPEN" | "REOPENED";
  }>[];
}>;

export type SecondStageOwnerSubjectCard = Readonly<{
  subjectId: SecondStageOwnerSubjectId;
  label: string;
  status: "unavailable" | "error" | "start" | "resume" | "due" | "stable";
  statusLabel: string;
  description: string;
  href: string | null;
  linkLabel: string | null;
  eligibleReviewCount: number;
}>;

export type SecondStageOwnerPrimaryAction = Readonly<{
  kind: "due" | "resume" | "start" | "retry" | "new_capture";
  subjectId: SecondStageOwnerSubjectId | null;
  label: string;
  reason: string;
  estimatedMinutes: string;
  after: string;
  href: string;
}>;

export type SecondStageOwnerHomeView = Readonly<{
  primaryAction: SecondStageOwnerPrimaryAction;
  subjects: readonly SecondStageOwnerSubjectCard[];
  admittedSubjectCount: number;
  readErrorCount: number;
}>;

const SUBJECT_ORDER = new Map(
  SECOND_STAGE_OWNER_SUBJECTS.map((subject, index) => [subject.id, index]),
);

const REVIEW_PHASE_ORDER: Record<SecondStageOwnerReviewPhase, number> = {
  REOPENED_REVIEW: 0,
  D1: 1,
  D7_TRANSFER: 2,
  RECURRENCE: 3,
};

const ACTIVE_STATE_COPY: Record<
  Exclude<SecondStageOwnerRecordState, "CLOSED">,
  string
> = {
  D0_OPEN: "첫 답안을 작성하고 있습니다.",
  FEEDBACK_COMMITTED: "가장 큰 감점 원인을 확인하고 직접 고칠 차례입니다.",
  REPAIRED: "교정 뒤 다음 날 혼자 확인할 기록이 남아 있습니다.",
  D1_COMPLETE: "다른 문제에서 다시 되는지 확인할 기록이 남아 있습니다.",
  D7_COMPLETE: "제한시간 안에서도 유지되는지 확인할 기록이 남아 있습니다.",
  REOPENED: "이후 수행에서 다시 나타난 간극을 확인할 차례입니다.",
};

function subjectDefinition(subjectId: SecondStageOwnerSubjectId) {
  const subject = SECOND_STAGE_OWNER_SUBJECTS.find(
    (candidate) => candidate.id === subjectId,
  );
  if (!subject) throw new Error("second-stage-owner-home:unknown-subject");
  return subject;
}

function subjectHref(subjectId: SecondStageOwnerSubjectId, recordId?: string) {
  const base = subjectDefinition(subjectId).href;
  return recordId ? `${base}?recordId=${encodeURIComponent(recordId)}` : base;
}

function reviewPhaseCopy(phase: SecondStageOwnerReviewPhase) {
  if (phase === "D1") return "다음 날 혼자 해보기";
  if (phase === "D7_TRANSFER") return "다른 문제에서 해보기";
  if (phase === "RECURRENCE") return "제한시간 실전 확인";
  return "다시 확인하기";
}

function eligibleQueue(snapshot: SecondStageOwnerRuntimeSnapshot) {
  return snapshot.queue
    .filter((item) => item.eligible)
    .sort(
      (left, right) =>
        REVIEW_PHASE_ORDER[left.reviewPhase] -
          REVIEW_PHASE_ORDER[right.reviewPhase] ||
        left.dueAt.localeCompare(right.dueAt) ||
        left.recordId.localeCompare(right.recordId),
    );
}

function toSubjectCard(
  snapshot: SecondStageOwnerRuntimeSnapshot,
): SecondStageOwnerSubjectCard {
  const subject = subjectDefinition(snapshot.subjectId);
  if (snapshot.readState === "unavailable") {
    return {
      subjectId: snapshot.subjectId,
      label: subject.label,
      status: "unavailable",
      statusLabel: "사용 안 함",
      description: "현재 이 과목의 기존 Owner 전용 실행 조건이 열려 있지 않습니다.",
      href: null,
      linkLabel: null,
      eligibleReviewCount: 0,
    };
  }
  if (snapshot.readState === "error") {
    return {
      subjectId: snapshot.subjectId,
      label: subject.label,
      status: "error",
      statusLabel: "상태 확인 필요",
      description: "실행 조건은 열려 있지만 저장된 상태를 읽지 못했습니다.",
      href: null,
      linkLabel: null,
      eligibleReviewCount: 0,
    };
  }

  const queue = eligibleQueue(snapshot);
  if (queue[0]) {
    return {
      subjectId: snapshot.subjectId,
      label: subject.label,
      status: "due",
      statusLabel: reviewPhaseCopy(queue[0].reviewPhase),
      description: `${queue.length}개의 독립 확인 또는 복구 작업이 지금 가능합니다.`,
      href: subjectHref(snapshot.subjectId, queue[0].recordId),
      linkLabel: "이어가기",
      eligibleReviewCount: queue.length,
    };
  }
  if (snapshot.record && snapshot.record.state !== "CLOSED") {
    return {
      subjectId: snapshot.subjectId,
      label: subject.label,
      status: "resume",
      statusLabel: "진행 중",
      description: ACTIVE_STATE_COPY[snapshot.record.state],
      href: subjectHref(snapshot.subjectId, snapshot.record.id),
      linkLabel: "이어가기",
      eligibleReviewCount: 0,
    };
  }
  if (!snapshot.record) {
    return {
      subjectId: snapshot.subjectId,
      label: subject.label,
      status: "start",
      statusLabel: "시작 가능",
      description: "이 과목의 기존 Owner 전용 학습 루프를 시작할 수 있습니다.",
      href: subject.href,
      linkLabel: "시작하기",
      eligibleReviewCount: 0,
    };
  }
  return {
    subjectId: snapshot.subjectId,
    label: subject.label,
    status: "stable",
    statusLabel: "현재 안정",
    description: "현재 기록에는 바로 수행할 독립 확인 작업이 없습니다.",
    href: subjectHref(snapshot.subjectId, snapshot.record.id),
    linkLabel: "기록 보기",
    eligibleReviewCount: 0,
  };
}

function compareSubject(left: SecondStageOwnerSubjectId, right: SecondStageOwnerSubjectId) {
  return (SUBJECT_ORDER.get(left) ?? 99) - (SUBJECT_ORDER.get(right) ?? 99);
}

export function buildSecondStageOwnerHome(
  input: readonly SecondStageOwnerRuntimeSnapshot[],
): SecondStageOwnerHomeView {
  const bySubject = new Map(input.map((snapshot) => [snapshot.subjectId, snapshot]));
  const snapshots = SECOND_STAGE_OWNER_SUBJECTS.map(
    (subject) =>
      bySubject.get(subject.id) ?? {
        subjectId: subject.id,
        readState: "unavailable" as const,
        record: null,
        queue: [],
      },
  );
  const admitted = snapshots.filter(
    (snapshot) => snapshot.readState !== "unavailable",
  );
  if (admitted.length === 0) {
    throw new Error("second-stage-owner-home:no-admitted-subject");
  }

  const subjects = snapshots.map(toSubjectCard);
  const dueCandidates = admitted
    .filter((snapshot) => snapshot.readState === "ready")
    .flatMap((snapshot) =>
      eligibleQueue(snapshot).map((item) => ({ snapshot, item })),
    )
    .sort(
      (left, right) =>
        REVIEW_PHASE_ORDER[left.item.reviewPhase] -
          REVIEW_PHASE_ORDER[right.item.reviewPhase] ||
        left.item.dueAt.localeCompare(right.item.dueAt) ||
        compareSubject(left.snapshot.subjectId, right.snapshot.subjectId),
    );
  const due = dueCandidates[0];
  let primaryAction: SecondStageOwnerPrimaryAction;

  if (due) {
    const subject = subjectDefinition(due.snapshot.subjectId);
    primaryAction = {
      kind: "due",
      subjectId: due.snapshot.subjectId,
      label: `${subject.shortLabel} ${reviewPhaseCopy(due.item.reviewPhase)}`,
      reason: "저장된 시점과 수행 기록상 지금 확인할 수 있는 작업이 가장 먼저입니다.",
      estimatedMinutes: "약 10분",
      after: "결과가 같은 과목의 다음 독립 확인 단계와 오늘 계획에 이어집니다.",
      href: subjectHref(due.snapshot.subjectId, due.item.recordId),
    };
  } else {
    const active = admitted
      .filter(
        (snapshot) =>
          snapshot.readState === "ready" &&
          snapshot.record &&
          snapshot.record.state !== "CLOSED",
      )
      .sort(
        (left, right) =>
          (right.record?.updatedAt ?? "").localeCompare(
            left.record?.updatedAt ?? "",
          ) || compareSubject(left.subjectId, right.subjectId),
      )[0];
    if (active?.record) {
      const subject = subjectDefinition(active.subjectId);
      primaryAction = {
        kind: "resume",
        subjectId: active.subjectId,
        label: `${subject.shortLabel} 진행 기록 이어가기`,
        reason: ACTIVE_STATE_COPY[active.record.state as Exclude<SecondStageOwnerRecordState, "CLOSED">],
        estimatedMinutes: "약 10분",
        after: "현재 기록을 보존한 채 다음 검증 단계로 이어집니다.",
        href: subjectHref(active.subjectId, active.record.id),
      };
    } else {
      const start = admitted.find(
        (snapshot) => snapshot.readState === "ready" && !snapshot.record,
      );
      if (start) {
        const subject = subjectDefinition(start.subjectId);
        primaryAction = {
          kind: "start",
          subjectId: start.subjectId,
          label: `${subject.shortLabel} 학습 루프 시작`,
          reason: "저장된 진행 기록이 없어 첫 과목부터 시작할 수 있습니다.",
          estimatedMinutes: "약 15분",
          after: "첫 수행 뒤 가장 큰 간극과 다음 확인 시점이 기록됩니다.",
          href: subject.href,
        };
      } else if (admitted.some((snapshot) => snapshot.readState === "error")) {
        primaryAction = {
          kind: "retry",
          subjectId: null,
          label: "저장 상태 다시 확인",
          reason: "열려 있는 과목의 저장 상태를 아직 확인하지 못했습니다.",
          estimatedMinutes: "잠시 후",
          after: "읽기가 복구되면 실제 진행 기록에 맞는 다음 행동을 다시 고릅니다.",
          href: "/app/second-stage",
        };
      } else {
        primaryAction = {
          kind: "new_capture",
          subjectId: null,
          label: "새 2차 답안 올리기",
          reason: "세 과목의 현재 독립 확인 작업이 모두 끝난 상태입니다.",
          estimatedMinutes: "약 18분",
          after: "저장된 답안에서 다음 교정과 복습 작업이 만들어집니다.",
          href: "/app/capture?mode=second",
        };
      }
    }
  }

  return {
    primaryAction,
    subjects,
    admittedSubjectCount: admitted.length,
    readErrorCount: admitted.filter((snapshot) => snapshot.readState === "error").length,
  };
}
