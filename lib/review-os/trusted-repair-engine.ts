import {
  TRUSTED_REPAIR_LOAD_BUDGET,
  TrustedRepairContractError,
  type TrustedRepairAggregate,
  type TrustedRepairArtifactKind,
  type TrustedRepairContinuation,
  type TrustedRepairFixture,
  type TrustedRepairGapCandidate,
  type TrustedRepairInputMode,
  type TrustedRepairPrivateArtifact,
  type TrustedRepairState,
  type TrustedRepairStateData,
  type TrustedRepairTransitionPlan,
} from "./trusted-repair-contract";

export type TrustedRepairLawBindingState = Readonly<{
  bindingVersion: string;
  sourceStatus:
    | "verified"
    | "needs_official_verification"
    | "unresolved_conflict"
    | "blocked"
    | "synthetic_fixture";
  versionStatus:
    | "verified"
    | "needs_official_verification"
    | "unresolved_conflict"
    | "blocked"
    | "synthetic_fixture";
  currentLawStatus:
    | "current_law_verified"
    | "current_law_unresolved"
    | "not_current"
    | "synthetic_fixture";
  sourceAnchorId: string | null;
  blockerCount: number;
}>;

export const SYNTHETIC_SOURCE_BINDING: TrustedRepairLawBindingState = {
  bindingVersion: "synthetic_fixture",
  sourceStatus: "synthetic_fixture",
  versionStatus: "synthetic_fixture",
  currentLawStatus: "synthetic_fixture",
  sourceAnchorId: null,
  blockerCount: 0,
};

type TrustedRepairRealLawVerificationStatus = Exclude<
  TrustedRepairLawBindingState["sourceStatus"],
  "synthetic_fixture"
>;

const TRUSTED_REPAIR_LAW_STATUS_PRECEDENCE = {
  verified: 0,
  needs_official_verification: 1,
  unresolved_conflict: 2,
  blocked: 3,
} as const satisfies Record<TrustedRepairRealLawVerificationStatus, number>;

export function reduceTrustedRepairLawVerificationStatus(
  sourceStatus: TrustedRepairLawBindingState["sourceStatus"],
  anchorStatus: TrustedRepairLawBindingState["sourceStatus"],
): TrustedRepairRealLawVerificationStatus {
  if (
    sourceStatus === "synthetic_fixture" ||
    anchorStatus === "synthetic_fixture"
  ) {
    return "blocked";
  }
  return TRUSTED_REPAIR_LAW_STATUS_PRECEDENCE[sourceStatus] >=
    TRUSTED_REPAIR_LAW_STATUS_PRECEDENCE[anchorStatus]
    ? sourceStatus
    : anchorStatus;
}

export function trustedRepairSourceVersion(
  fixture: TrustedRepairFixture,
  sourceBinding: TrustedRepairLawBindingState,
) {
  return [
    fixture.sourceBinding.sourceId,
    sourceBinding.bindingVersion,
    sourceBinding.sourceStatus,
    sourceBinding.versionStatus,
    sourceBinding.currentLawStatus,
    sourceBinding.sourceAnchorId ?? "no-anchor",
    `blockers-${sourceBinding.blockerCount}`,
  ].join(":");
}

export function trustedRepairSourceBindingMatches(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
}) {
  return (
    input.aggregate.session.bindings.sourceVersion ===
    trustedRepairSourceVersion(input.fixture, input.sourceBinding)
  );
}

export function trustedRepairLawReleaseEligible(input: {
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
}) {
  return (
    input.sourceBinding.sourceStatus === "verified" &&
    input.sourceBinding.versionStatus === "verified" &&
    input.sourceBinding.currentLawStatus === "current_law_verified" &&
    input.sourceBinding.sourceAnchorId ===
      input.fixture.sourceBinding.sourceAnchorId &&
    input.sourceBinding.blockerCount === 0
  );
}

function guardState(
  aggregate: TrustedRepairAggregate,
  expected: TrustedRepairState | readonly TrustedRepairState[],
) {
  const expectedStates = Array.isArray(expected) ? expected : [expected];
  if (!expectedStates.includes(aggregate.session.state)) {
    throw new TrustedRepairContractError("invalid_transition");
  }
}

function normalizeEvidence(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,._·:;()[\]{}]+/g, "");
}

const MAX_SUBJECT_LOOKBACK_TOKENS = 4;
const MAX_SUBJECT_SCOPE_KEY_LENGTH = 48;
const NEGATING_PREFIXES = new Set(["불", "비", "미", "무"]);
const NEGATING_SUFFIX = /^(?:(?:은|는|도)?(?:이|하)지(?:는|도)?(?:않|못|아니)|(?:은|는|도)?(?:이|가)?아니|(?:이|하)?는?것이아니|(?:이|하)?라고보기어렵|성(?:은|이|도)?없)/;
const AMBIGUOUS_SUFFIX = /^(?:(?:한|인|일)지|(?:할|일|인|한)지도|(?:할|일)수도|여부|불확실|미정|의문|(?:이|하)?라고단정하기어렵)/;
const AMBIGUOUS_PREFIX = /(?:아마|혹시|불확실|미정|의문)$/;
const NUMERIC_UNIT_PREFIX = /^(?:억원|만원|천원|원(?:\/m(?:²|2))?|제곱미터|m(?:²|2)|퍼센트|%|개|명|배|억)/;
const IGNORABLE_SEMANTIC_SEPARATOR = /[\s,._·:()[\]{}]/u;
const KOREAN_SEMANTIC_SUFFIX = /^(?:(?:은|는|이|가|을|를|의|에|에서|에게|께|도|만|과|와|으로|로|부터|까지|처럼|보다|마다|조차|마저|이나|나|라도|라고|이며|이고)|(?:이|하)?(?:다|고|며|면|니|지만|지|는|ㄴ|한|할|함|였다|었|여|해|한다|하여|해서)|적(?:인|으로|이다|이며|이고)?|성(?:은|이|도|을)?)/;
const CURRENCY_RIGHT_CONTEXT = /^(?:(?:을|를)?단위|으로|로|이다|이며|이고|이라고|이라는|인지|을|를)/;
const CURRENCY_LEFT_CONTEXT = /단위(?:은|는|이|가|을|를|로)?$/;
const UNIT_POLARITY_BRIDGE = /^(?:단위)/;
const SUBJECT_PARTICLES = new Set(["은", "는", "이", "가"]);
const SUBJECT_SCOPE_CONNECTOR_PREFIX = /^(?:(?:그러나|하지만|반면|다만))+/;
const SUBJECT_SCOPE_MODIFIERS = new Set([
  "반례",
  "다른",
  "비교대상",
  "해당",
]);
const DEMONSTRATIVE_SUBJECT_MODIFIERS = new Set(["이", "그", "저"]);
const ANAPHORIC_SUBJECT_SCOPES = new Set([
  "이",
  "그것",
  "해당이용",
  "본건",
]);
const DISTINCT_COUNTEREXAMPLE_SCOPE = /(?:반례|다른|비교대상|대안)/;

type SemanticOccurrence = Readonly<{
  index: number;
  length: number;
  polarityBridgeLength: number;
}>;

type CompactPolarityClause = Readonly<{
  text: string;
  boundaries: ReadonlySet<number>;
  tokens: readonly Readonly<{
    text: string;
    start: number;
    end: number;
  }>[];
}>;

export type ConceptAssertionState =
  | "positive"
  | "negated"
  | "ambiguous"
  | "absent";

type SubjectScope = Readonly<{
  key: string;
  distinctCounterexample: boolean;
}>;

type ConceptAssertionEvaluation = Readonly<{
  state: ConceptAssertionState;
  hasPositiveOccurrence: boolean;
  hasNegatedOccurrence: boolean;
  hasAmbiguousOccurrence: boolean;
  sameTargetConflict: boolean;
  scopeKeys: readonly string[];
}>;

type SubjectScopeCandidate =
  | Readonly<{ kind: "explicit"; scope: SubjectScope }>
  | Readonly<{ kind: "anaphoric" }>
  | Readonly<{ kind: "unscoped" }>;

function compactPolarityClause(value: string) {
  const boundaries = new Set<number>();
  const tokens: { text: string; start: number; end: number }[] = [];
  let text = "";
  let separated = false;
  let tokenStart: number | null = null;
  for (const character of value.normalize("NFKC").toLowerCase()) {
    if (IGNORABLE_SEMANTIC_SEPARATOR.test(character)) {
      if (tokenStart !== null) {
        tokens.push({
          text: text.slice(tokenStart),
          start: tokenStart,
          end: text.length,
        });
        tokenStart = null;
      }
      separated = true;
      continue;
    }
    if (separated && text.length > 0) boundaries.add(text.length);
    if (tokenStart === null) tokenStart = text.length;
    text += character;
    separated = false;
  }
  if (tokenStart !== null) {
    tokens.push({
      text: text.slice(tokenStart),
      start: tokenStart,
      end: text.length,
    });
  }
  if (separated && text.length > 0) boundaries.add(text.length);
  return { text, boundaries, tokens } satisfies CompactPolarityClause;
}

function literalOccurrences(clause: string, literal: string) {
  const occurrences: { index: number; length: number }[] = [];
  let fromIndex = 0;
  while (fromIndex <= clause.length) {
    const index = clause.indexOf(literal, fromIndex);
    if (index < 0) break;
    occurrences.push({ index, length: literal.length });
    fromIndex = index + Math.max(1, literal.length);
  }
  return occurrences;
}

function semanticLeftBoundary(
  clause: CompactPolarityClause,
  occurrence: { index: number; length: number },
  normalizedConcept: string,
) {
  if (occurrence.index === 0 || clause.boundaries.has(occurrence.index)) {
    return true;
  }
  const previous = clause.text.slice(occurrence.index - 1, occurrence.index);
  const prefixStartsAt = occurrence.index - 1;
  if (
    NEGATING_PREFIXES.has(previous) &&
    (prefixStartsAt === 0 || clause.boundaries.has(prefixStartsAt))
  ) {
    return true;
  }
  return (
    (normalizedConcept === "원" || normalizedConcept === "m2") &&
    /^\d$/.test(previous)
  );
}

function currencyOccurrenceEligible(
  clause: CompactPolarityClause,
  occurrence: { index: number; length: number },
) {
  const end = occurrence.index + occurrence.length;
  const previous = clause.text.slice(occurrence.index - 1, occurrence.index);
  const attachedToAmount = occurrence.index > 0 && /^\d$/.test(previous);
  if (!attachedToAmount && !semanticLeftBoundary(clause, occurrence, "원")) {
    return false;
  }
  const prefix = clause.text.slice(Math.max(0, occurrence.index - 12), occurrence.index);
  const suffix = clause.text.slice(end, end + 32);
  if (attachedToAmount) {
    return (
      end === clause.text.length ||
      clause.boundaries.has(end) ||
      KOREAN_SEMANTIC_SUFFIX.test(suffix)
    );
  }
  return CURRENCY_RIGHT_CONTEXT.test(suffix) || CURRENCY_LEFT_CONTEXT.test(prefix);
}

function completeSemanticOccurrences(
  clause: CompactPolarityClause,
  normalizedConcept: string,
) {
  return literalOccurrences(clause.text, normalizedConcept)
    .filter((occurrence) => {
      if (normalizedConcept === "원") {
        return currencyOccurrenceEligible(clause, occurrence);
      }
      if (!semanticLeftBoundary(clause, occurrence, normalizedConcept)) {
        return false;
      }
      const end = occurrence.index + occurrence.length;
      if (end === clause.text.length || clause.boundaries.has(end)) return true;
      const suffix = clause.text.slice(end, end + 32);
      return (
        KOREAN_SEMANTIC_SUFFIX.test(suffix) ||
        NEGATING_SUFFIX.test(suffix) ||
        AMBIGUOUS_SUFFIX.test(suffix) ||
        (normalizedConcept === "m2" && UNIT_POLARITY_BRIDGE.test(suffix))
      );
    })
    .map((occurrence): SemanticOccurrence => {
      const suffix = clause.text.slice(
        occurrence.index + occurrence.length,
        occurrence.index + occurrence.length + 32,
      );
      const bridge =
        normalizedConcept === "원" || normalizedConcept === "m2"
          ? suffix.match(UNIT_POLARITY_BRIDGE)?.[0] ?? ""
          : "";
      return {
        ...occurrence,
        polarityBridgeLength: bridge.length,
      };
    });
}

function conceptOccurrences(
  clause: CompactPolarityClause,
  normalizedConcept: string,
) {
  if (!/^\d+$/.test(normalizedConcept)) {
    return completeSemanticOccurrences(clause, normalizedConcept);
  }

  const occurrences: SemanticOccurrence[] = [];
  for (const match of clause.text.matchAll(/\d+/g)) {
    if (match[0] === normalizedConcept && match.index !== undefined) {
      occurrences.push({
        index: match.index,
        length: match[0].length,
        polarityBridgeLength: 0,
      });
    }
  }
  const aliases =
    normalizedConcept === "200000000"
      ? ["2억"]
      : normalizedConcept === "2000000"
        ? ["200만원"]
        : [];
  for (const alias of aliases) {
    occurrences.push(...completeSemanticOccurrences(clause, alias));
  }
  return occurrences.sort(
    (left, right) => left.index - right.index || left.length - right.length,
  );
}

function classifyConceptOccurrence(
  clause: string,
  occurrence: SemanticOccurrence,
  normalizedConcept: string,
): Exclude<ConceptAssertionState, "absent"> {
  const prefix = clause.slice(Math.max(0, occurrence.index - 12), occurrence.index);
  const suffix = clause.slice(
    occurrence.index + occurrence.length + occurrence.polarityBridgeLength,
    occurrence.index + occurrence.length + occurrence.polarityBridgeLength + 32,
  );
  const suffixes = [suffix];
  if (/^\d+$/.test(normalizedConcept)) {
    const withoutUnit = suffix.replace(NUMERIC_UNIT_PREFIX, "");
    if (withoutUnit !== suffix) suffixes.push(withoutUnit);
  }
  const attachedCurrencyUnit =
    normalizedConcept === "원" &&
    /^\d$/.test(clause.slice(occurrence.index - 1, occurrence.index));
  const negated =
    !attachedCurrencyUnit &&
    (NEGATING_PREFIXES.has(prefix.slice(-1)) ||
      suffixes.some((candidate) => NEGATING_SUFFIX.test(candidate)));
  const ambiguous =
    !attachedCurrencyUnit &&
    (AMBIGUOUS_PREFIX.test(prefix) ||
      suffixes.some((candidate) => AMBIGUOUS_SUFFIX.test(candidate)));
  if (negated) return "negated";
  if (ambiguous) return "ambiguous";
  return "positive";
}

function boundedSubjectScopeKey(value: string) {
  return normalizeEvidence(value)
    .replace(SUBJECT_SCOPE_CONNECTOR_PREFIX, "")
    .slice(0, MAX_SUBJECT_SCOPE_KEY_LENGTH);
}

function subjectScopeCandidateFromToken(
  clause: CompactPolarityClause,
  tokenIndex: number,
): SubjectScopeCandidate {
  const token = clause.tokens[tokenIndex];
  const particle = token.text.slice(-1);
  if (!SUBJECT_PARTICLES.has(particle) || token.text.length <= 1) {
    return { kind: "unscoped" };
  }

  const base = token.text.slice(0, -1);
  const parts = [base];
  const previous = clause.tokens[tokenIndex - 1]?.text ?? "";
  const twoBack = clause.tokens[tokenIndex - 2]?.text ?? "";
  if (SUBJECT_SCOPE_MODIFIERS.has(previous)) {
    parts.unshift(previous);
  } else if (twoBack === "비교" && previous === "대상") {
    parts.unshift(twoBack, previous);
  } else if (
    DEMONSTRATIVE_SUBJECT_MODIFIERS.has(twoBack) &&
    previous.length > 0 &&
    previous.length <= 16
  ) {
    parts.unshift(twoBack, previous);
  }

  const key = boundedSubjectScopeKey(parts.join(""));
  if (key.length === 0) return { kind: "unscoped" };
  if (ANAPHORIC_SUBJECT_SCOPES.has(key)) return { kind: "anaphoric" };
  if (base.length < 2 && parts.length === 1) return { kind: "unscoped" };
  return {
    kind: "explicit",
    scope: {
      key,
      distinctCounterexample: DISTINCT_COUNTEREXAMPLE_SCOPE.test(key),
    },
  };
}

function subjectScopeCandidateForOccurrence(
  clause: CompactPolarityClause,
  occurrence: SemanticOccurrence,
  normalizedConcept: string,
): SubjectScopeCandidate {
  let inspected = 0;
  for (let index = clause.tokens.length - 1; index >= 0; index -= 1) {
    const token = clause.tokens[index];
    if (token.end > occurrence.index) continue;
    inspected += 1;
    if (inspected > MAX_SUBJECT_LOOKBACK_TOKENS) break;
    const candidate = subjectScopeCandidateFromToken(clause, index);
    if (candidate.kind !== "unscoped") return candidate;
  }

  const occurrenceEnd = occurrence.index + occurrence.length;
  const followingParticle = clause.text.slice(
    occurrenceEnd,
    occurrenceEnd + 1,
  );
  if (
    SUBJECT_PARTICLES.has(followingParticle) &&
    (occurrenceEnd + 1 === clause.text.length ||
      clause.boundaries.has(occurrenceEnd + 1))
  ) {
    const key = boundedSubjectScopeKey(normalizedConcept);
    if (key.length > 0) {
      return {
        kind: "explicit",
        scope: { key, distinctCounterexample: false },
      };
    }
  }
  return { kind: "unscoped" };
}

function lastExplicitSubjectScope(clause: CompactPolarityClause) {
  for (let index = clause.tokens.length - 1; index >= 0; index -= 1) {
    const candidate = subjectScopeCandidateFromToken(clause, index);
    if (candidate.kind === "explicit") return candidate.scope;
  }
  return null;
}

function reduceOccurrenceStates(
  states: ReadonlySet<Exclude<ConceptAssertionState, "absent">>,
): Exclude<ConceptAssertionState, "absent"> {
  if (states.size > 1) return "ambiguous";
  if (states.has("positive")) return "positive";
  if (states.has("ambiguous")) return "ambiguous";
  return "negated";
}

function evaluateConceptAssertion(
  text: string,
  concept: string,
): ConceptAssertionEvaluation {
  const normalizedConcept = normalizeEvidence(concept);
  if (normalizedConcept.length === 0) {
    return {
      state: "absent",
      hasPositiveOccurrence: false,
      hasNegatedOccurrence: false,
      hasAmbiguousOccurrence: false,
      sameTargetConflict: false,
      scopeKeys: [],
    };
  }

  const occurrencesByScope = new Map<
    string | null,
    {
      states: Set<Exclude<ConceptAssertionState, "absent">>;
      distinctCounterexample: boolean;
    }
  >();
  let lastExplicitScope: SubjectScope | null = null;
  let hasPositiveOccurrence = false;
  let hasNegatedOccurrence = false;
  let hasAmbiguousOccurrence = false;
  const clauses = text
    .normalize("NFKC")
    .toLowerCase()
    .split(/[!?。！？;\n]+|\.(?!\d)/);

  for (const rawClause of clauses) {
    const clause = compactPolarityClause(rawClause);
    const occurrences = conceptOccurrences(clause, normalizedConcept);
    for (const occurrence of occurrences) {
      const candidate = subjectScopeCandidateForOccurrence(
        clause,
        occurrence,
        normalizedConcept,
      );
      const scope =
        candidate.kind === "explicit"
          ? candidate.scope
          : candidate.kind === "anaphoric"
            ? lastExplicitScope
            : null;
      if (candidate.kind === "explicit") lastExplicitScope = candidate.scope;
      const state = classifyConceptOccurrence(
        clause.text,
        occurrence,
        normalizedConcept,
      );
      if (state === "positive") hasPositiveOccurrence = true;
      if (state === "negated") hasNegatedOccurrence = true;
      if (state === "ambiguous") hasAmbiguousOccurrence = true;
      const scopeKey = scope?.key ?? null;
      const aggregate = occurrencesByScope.get(scopeKey) ?? {
        states: new Set<Exclude<ConceptAssertionState, "absent">>(),
        distinctCounterexample: scope?.distinctCounterexample ?? false,
      };
      aggregate.states.add(state);
      aggregate.distinctCounterexample ||=
        scope?.distinctCounterexample ?? false;
      occurrencesByScope.set(scopeKey, aggregate);
    }
    lastExplicitScope = lastExplicitSubjectScope(clause) ?? lastExplicitScope;
  }

  if (occurrencesByScope.size === 0) {
    return {
      state: "absent",
      hasPositiveOccurrence,
      hasNegatedOccurrence,
      hasAmbiguousOccurrence,
      sameTargetConflict: false,
      scopeKeys: [],
    };
  }

  const groups = [...occurrencesByScope].map(([key, aggregate]) => ({
    key,
    state: reduceOccurrenceStates(aggregate.states),
    sameTargetConflict: aggregate.states.size > 1,
    distinctCounterexample: aggregate.distinctCounterexample,
  }));
  const unscoped = groups.find((group) => group.key === null);
  const explicit = groups.filter((group) => group.key !== null);
  const cleanPositiveScopes = explicit.filter(
    (group) => group.state === "positive",
  );
  let state: ConceptAssertionState;
  if (cleanPositiveScopes.length > 0) {
    const unresolvedExplicitConflict = explicit.some(
      (group) =>
        group.state !== "positive" && !group.distinctCounterexample,
    );
    const unresolvedUnscopedConflict =
      unscoped !== undefined && unscoped.state !== "positive";
    state =
      unresolvedExplicitConflict || unresolvedUnscopedConflict
        ? "ambiguous"
        : "positive";
  } else if (unscoped?.state === "positive") {
    state = explicit.some((group) => group.state !== "positive")
      ? "ambiguous"
      : "positive";
  } else if (groups.some((group) => group.state === "ambiguous")) {
    state = "ambiguous";
  } else if (groups.some((group) => group.state === "negated")) {
    state = "negated";
  } else {
    state = "absent";
  }

  return {
    state,
    hasPositiveOccurrence,
    hasNegatedOccurrence,
    hasAmbiguousOccurrence,
    sameTargetConflict: groups.some((group) => group.sameTargetConflict),
    scopeKeys: explicit.map((group) => group.key as string),
  };
}

export function evaluateConceptAssertionState(
  text: string,
  concept: string,
): ConceptAssertionState {
  return evaluateConceptAssertion(text, concept).state;
}

function anchorEvidence(text: string, fixture: TrustedRepairFixture) {
  return fixture.anchors.map((anchor) => {
    const alternatives = anchor.acceptableAlternativeGroups.flatMap((group) =>
      group.alternatives.map((alternative) => {
        const evaluation = evaluateConceptAssertion(text, alternative);
        return {
          alternative,
          requiredConcepts: group.requiredConcepts,
          state: evaluation.state,
        };
      }),
    );
    const required = anchor.requiredConcepts.map((concept) => {
      const canonicalState = evaluateConceptAssertion(text, concept).state;
      const mappedAlternativeSupport = alternatives
        .filter(
          (entry) =>
            entry.state === "positive" &&
            entry.requiredConcepts.includes(concept),
        )
        .map((entry) => entry.alternative);
      return {
        concept,
        canonicalState,
        mappedAlternativeSupport,
        satisfied:
          canonicalState === "positive" || mappedAlternativeSupport.length > 0,
      };
    });
    const forbidden = anchor.forbiddenFalseClaims.map((claim) => {
      const evaluation = evaluateConceptAssertion(text, claim);
      return {
        claim,
        state: evaluation.state,
        hasPositiveOccurrence: evaluation.hasPositiveOccurrence,
        hasNegatedOccurrence: evaluation.hasNegatedOccurrence,
        hasAmbiguousOccurrence: evaluation.hasAmbiguousOccurrence,
        sameTargetConflict: evaluation.sameTargetConflict,
      };
    });
    const missing = required.filter((entry) => !entry.satisfied);
    const falseClaims = forbidden.filter(
      (entry) => entry.hasPositiveOccurrence,
    );
    const canonicalPositiveSupport = required.filter(
      (entry) => entry.canonicalState === "positive",
    );
    const mappedAlternativeSupport = required.flatMap((entry) =>
      entry.mappedAlternativeSupport.map((alternative) => ({
        concept: entry.concept,
        alternative,
      })),
    );
    return {
      anchor,
      missing,
      canonicalPositiveSupport,
      mappedAlternativeSupport,
      nonPositiveAlternatives: alternatives.filter(
        (entry) => entry.state === "negated" || entry.state === "ambiguous",
      ),
      falseClaims,
      negatedForbiddenClaims: forbidden.filter(
        (entry) =>
          !entry.hasPositiveOccurrence && entry.state === "negated",
      ),
      ambiguousForbiddenClaims: forbidden.filter(
        (entry) =>
          !entry.hasPositiveOccurrence && entry.state === "ambiguous",
      ),
      contradictoryForbiddenClaims: forbidden.filter(
        (entry) =>
          entry.hasPositiveOccurrence &&
          (entry.hasNegatedOccurrence ||
            entry.hasAmbiguousOccurrence ||
            entry.sameTargetConflict),
      ),
      satisfied: missing.length === 0 && falseClaims.length === 0,
    };
  });
}

export function latestTrustedRepairArtifact(
  aggregate: TrustedRepairAggregate,
  kind: TrustedRepairArtifactKind,
) {
  return aggregate.artifacts.reduce<TrustedRepairPrivateArtifact | null>(
    (latest, artifact) => {
      if (artifact.kind !== kind) return latest;
      if (!latest || artifact.revisionNumber > latest.revisionNumber) {
        return artifact;
      }
      if (
        artifact.revisionNumber === latest.revisionNumber &&
        artifact.createdAt >= latest.createdAt
      ) {
        return artifact;
      }
      return latest;
    },
    null,
  );
}

export function trustedRepairSubmissionCount(
  aggregate: TrustedRepairAggregate,
) {
  return aggregate.artifacts.filter(
    (artifact) => artifact.kind === "repair_submission",
  ).length;
}

export function trustedRepairPartialRetryAvailable(
  aggregate: TrustedRepairAggregate,
) {
  const retriesUsed = Math.max(0, trustedRepairSubmissionCount(aggregate) - 1);
  return (
    aggregate.session.state === "partial" &&
    aggregate.session.outcome === "partial" &&
    aggregate.session.confirmedRevisionId !== null &&
    aggregate.session.primaryGapId !== null &&
    aggregate.session.independentAttemptBeforeHelp &&
    aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    ) &&
    retriesUsed < TRUSTED_REPAIR_LOAD_BUDGET.maximumImmediatePartialRetries
  );
}

function basePlan(
  aggregate: TrustedRepairAggregate,
  nextState: TrustedRepairState,
  stateData: TrustedRepairStateData,
): TrustedRepairTransitionPlan {
  return {
    expectedState: aggregate.session.state,
    nextState,
    stateData,
    confirmedRevisionId: aggregate.session.confirmedRevisionId,
    primaryGapId: aggregate.session.primaryGapId,
    outcome: aggregate.session.outcome,
    assistanceLevel: aggregate.session.assistanceLevel,
    independentAttemptBeforeHelp:
      aggregate.session.independentAttemptBeforeHelp,
    artifact: null,
    exposure: null,
  };
}

export function planTrustedRepairSourceBindingDrift(
  aggregate: TrustedRepairAggregate,
): TrustedRepairTransitionPlan {
  const plan = basePlan(aggregate, "blocked", {
    ...aggregate.session.stateData,
    gapCandidates: [],
    repairNeed: "blocked",
    repairPath: null,
    continuation: null,
    resultReasonCodes: [
      "source_binding_version_drift",
      "verified_release_denied_until_new_session_diagnosis",
    ],
  });
  return {
    ...plan,
    primaryGapId: null,
    outcome: "blocked",
    assistanceLevel: 0,
    independentAttemptBeforeHelp: false,
  };
}

export function trustedRepairAggregateForRelease(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
}): TrustedRepairAggregate {
  if (trustedRepairSourceBindingMatches(input)) return input.aggregate;
  const plan = planTrustedRepairSourceBindingDrift(input.aggregate);
  return {
    session: {
      ...input.aggregate.session,
      state: plan.nextState,
      confirmedRevisionId: plan.confirmedRevisionId,
      primaryGapId: plan.primaryGapId,
      outcome: plan.outcome,
      assistanceLevel: plan.assistanceLevel,
      independentAttemptBeforeHelp: plan.independentAttemptBeforeHelp,
      stateData: plan.stateData,
    },
    artifacts: input.aggregate.artifacts,
    exposures: [],
  };
}

export function selectTrustedRepairScaffoldExposure(
  aggregate: TrustedRepairAggregate,
) {
  const expectedKind =
    aggregate.session.state === "guided" &&
    aggregate.session.assistanceLevel === 3
      ? "guided_solution"
      : "smallest_eligible_scaffold";
  for (let index = aggregate.exposures.length - 1; index >= 0; index -= 1) {
    const exposure = aggregate.exposures[index];
    if (
      exposure.revisionId === aggregate.session.confirmedRevisionId &&
      exposure.gapId === aggregate.session.primaryGapId &&
      exposure.assistanceLevel === aggregate.session.assistanceLevel &&
      exposure.scaffoldKind === expectedKind
    ) {
      return exposure;
    }
  }
  return null;
}

export function initialTrustedRepairStateData(
  inputMode: TrustedRepairInputMode,
): TrustedRepairStateData {
  return {
    inputMode,
    revisionNumber: 0,
    prediction: null,
    predictionConfidence: null,
    selfDiagnosisCode: null,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    continuation: null,
    resultReasonCodes: [],
  };
}

export function planTrustedRepairRevisionConfirmation(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "editable_capture_draft");
  const revisionNumber = input.aggregate.session.stateData.revisionNumber + 1;
  const plan = basePlan(input.aggregate, "revision_confirmed", {
    ...input.aggregate.session.stateData,
    revisionNumber,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    resultReasonCodes: [],
  });
  return {
    ...plan,
    confirmedRevisionId: input.artifactId,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber,
      kind: "confirmed_revision" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairPrediction(input: {
  aggregate: TrustedRepairAggregate;
  prediction: "likely_success" | "likely_partial" | "likely_blocked";
  confidence: "low" | "medium" | "high";
}) {
  guardState(input.aggregate, "revision_confirmed");
  return basePlan(input.aggregate, "prediction_committed", {
    ...input.aggregate.session.stateData,
    prediction: input.prediction,
    predictionConfidence: input.confidence,
  });
}

export function planTrustedRepairIndependentAttempt(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "prediction_committed");
  if (input.aggregate.exposures.length > 0) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "independent_attempt_committed", {
    ...input.aggregate.session.stateData,
    resultReasonCodes: ["independent_attempt_committed_before_help"],
  });
  return {
    ...plan,
    independentAttemptBeforeHelp: true,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber: input.aggregate.session.stateData.revisionNumber,
      kind: "independent_attempt" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairSelfDiagnosis(input: {
  aggregate: TrustedRepairAggregate;
  selfDiagnosisCode: string;
}) {
  guardState(input.aggregate, "independent_attempt_committed");
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/.test(input.selfDiagnosisCode)) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return basePlan(input.aggregate, "self_diagnosis_committed", {
    ...input.aggregate.session.stateData,
    selfDiagnosisCode: input.selfDiagnosisCode,
  });
}

function repairPathFor(input: {
  inputMode: TrustedRepairInputMode;
  confidence: TrustedRepairStateData["predictionConfidence"];
  insufficient: boolean;
}) {
  if (input.insufficient) return "WORKED_CONCEPT_FIRST" as const;
  if (input.inputMode === "EDITABLE_VOICE_TRANSCRIPTION") {
    return "VOICE_TEACH_BACK" as const;
  }
  if (input.inputMode === "STRUCTURED_SELECTION") {
    return "STRUCTURED_SELECTION" as const;
  }
  if (
    input.inputMode === "EDITABLE_PHOTO_OCR" ||
    input.inputMode === "EDITABLE_PDF_OCR"
  ) {
    return "UPLOAD_EXISTING_ARTIFACT" as const;
  }
  if (input.confidence === "high") return "QUICK_VERIFICATION" as const;
  return "LEARNER_GENERATED" as const;
}

export function diagnoseTrustedRepairAttempt(input: {
  fixture: TrustedRepairFixture;
  attemptText: string;
  stateData: TrustedRepairStateData;
}) {
  const insufficient = normalizeEvidence(input.attemptText).length < 12;
  if (insufficient) {
    const candidate: TrustedRepairGapCandidate = {
      gapId: "INSUFFICIENT_EVIDENCE",
      anchorId: input.fixture.anchors[0].anchorId,
      labelKo: "판단할 독립 근거가 부족함",
      rank: 1,
      supportingEvidence: ["independent_attempt:insufficient_evidence"],
      counterEvidence: ["no_committed_anchor_support"],
      repairActionKo: "가장 먼저 떠오르는 근거를 한 문장으로 직접 적으세요.",
      successCriterionKo: input.fixture.successCriterionKo,
    };
    return {
      candidates: [candidate],
      primary: candidate,
      repairNeed: "required" as const,
      repairPath: repairPathFor({
        inputMode: input.stateData.inputMode,
        confidence: input.stateData.predictionConfidence,
        insufficient: true,
      }),
    };
  }

  const evidence = anchorEvidence(input.attemptText, input.fixture);
  const candidates = evidence
    .filter((entry) => !entry.satisfied)
    .map((entry) => ({
      gapId: `gap-${entry.anchor.anchorId}`,
      anchorId: entry.anchor.anchorId,
      labelKo: entry.anchor.labelKo,
      score:
        entry.anchor.weight +
        entry.missing.length * 20 +
        entry.falseClaims.length * 100,
      supportingEvidence: [
        ...entry.missing.map(
          (missing) =>
            `independent_attempt:${entry.anchor.anchorId}:missing:${missing.concept}`,
        ),
        ...entry.missing
          .filter(
            (missing) =>
              missing.canonicalState === "negated" ||
              missing.canonicalState === "ambiguous",
          )
          .map(
            (missing) =>
              `independent_attempt:${entry.anchor.anchorId}:required_${missing.canonicalState}_no_support:${missing.concept}`,
          ),
        ...entry.falseClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:false_claim:${claim}`,
        ),
        ...entry.contradictoryForbiddenClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:forbidden_claim_contradictory_positive:${claim}`,
        ),
      ],
      counterEvidence: [
        ...entry.canonicalPositiveSupport.map(
          ({ concept }) =>
            `independent_attempt:${entry.anchor.anchorId}:canonical_positive_support:${concept}`,
        ),
        ...entry.mappedAlternativeSupport.map(
          ({ concept, alternative }) =>
            `independent_attempt:${entry.anchor.anchorId}:mapped_alternative_support:${alternative}->${concept}`,
        ),
        ...entry.negatedForbiddenClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:forbidden_claim_negated_ignored:${claim}`,
        ),
        ...entry.ambiguousForbiddenClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:forbidden_claim_ambiguous_ignored:${claim}`,
        ),
        ...entry.nonPositiveAlternatives.map(
          ({ alternative, state }) =>
            `independent_attempt:${entry.anchor.anchorId}:alternative_${state}_no_credit:${alternative}`,
        ),
      ],
      repairActionKo: `${entry.anchor.labelKo}을(를) 근거와 함께 한 문장으로 다시 구성하세요.`,
      successCriterionKo: input.fixture.successCriterionKo,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.anchorId.localeCompare(right.anchorId),
    )
    .slice(0, 3)
    .map((candidate, index) => ({
      gapId: candidate.gapId,
      anchorId: candidate.anchorId,
      labelKo: candidate.labelKo,
      rank: index + 1,
      supportingEvidence: candidate.supportingEvidence,
      counterEvidence: candidate.counterEvidence,
      repairActionKo: candidate.repairActionKo,
      successCriterionKo: candidate.successCriterionKo,
    }));

  const fallbackAnchor = input.fixture.anchors[0];
  const fallback: TrustedRepairGapCandidate = {
    gapId: `gap-${fallbackAnchor.anchorId}-verification`,
    anchorId: fallbackAnchor.anchorId,
    labelKo: `${fallbackAnchor.labelKo} 직접 검증`,
    rank: 1,
    supportingEvidence: [
      `independent_attempt:${fallbackAnchor.anchorId}:present_needs_reconstruction`,
    ],
    counterEvidence: [
      ...evidence.flatMap((entry) =>
        entry.canonicalPositiveSupport.map(
          ({ concept }) =>
            `independent_attempt:${entry.anchor.anchorId}:canonical_positive_support:${concept}`,
        ),
      ),
      ...evidence.flatMap((entry) =>
        entry.mappedAlternativeSupport.map(
          ({ concept, alternative }) =>
            `independent_attempt:${entry.anchor.anchorId}:mapped_alternative_support:${alternative}->${concept}`,
        ),
      ),
      ...evidence.flatMap((entry) =>
        entry.negatedForbiddenClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:forbidden_claim_negated_ignored:${claim}`,
        ),
      ),
      ...evidence.flatMap((entry) =>
        entry.ambiguousForbiddenClaims.map(
          ({ claim }) =>
            `independent_attempt:${entry.anchor.anchorId}:forbidden_claim_ambiguous_ignored:${claim}`,
        ),
      ),
      "same_session_reconstruction_not_yet_observed",
    ],
    repairActionKo: `${fallbackAnchor.labelKo}을(를) 보지 않고 한 번 더 구성하세요.`,
    successCriterionKo: input.fixture.successCriterionKo,
  };
  const bounded = candidates.length > 0 ? candidates : [fallback];
  return {
    candidates: bounded,
    primary: bounded[0],
    repairNeed: candidates.length > 0 ? ("required" as const) : ("optional" as const),
    repairPath: repairPathFor({
      inputMode: input.stateData.inputMode,
      confidence: input.stateData.predictionConfidence,
      insufficient: false,
    }),
  };
}

export function planTrustedRepairDiagnosis(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
}) {
  guardState(input.aggregate, "self_diagnosis_committed");
  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const attempt = latestTrustedRepairArtifact(
    input.aggregate,
    "independent_attempt",
  );
  if (!attempt) throw new TrustedRepairContractError("invalid_transition");
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture: input.fixture,
    attemptText: attempt.body,
    stateData: input.aggregate.session.stateData,
  });
  const sourceBlocked =
    input.fixture.sourceBinding.requiredStatus === "current_law_verified" &&
    !trustedRepairLawReleaseEligible(input);
  const plan = basePlan(input.aggregate, "diagnosed", {
    ...input.aggregate.session.stateData,
    gapCandidates: diagnosis.candidates,
    repairNeed: sourceBlocked ? "blocked" : diagnosis.repairNeed,
    repairPath: diagnosis.repairPath,
    resultReasonCodes: [
      "deterministic_top_1_gap_selected",
      ...(sourceBlocked ? ["law_source_currentness_unverified"] : []),
    ],
  });
  return {
    ...plan,
    primaryGapId: diagnosis.primary.gapId,
  };
}

export function planTrustedRepairExposure(input: {
  aggregate: TrustedRepairAggregate;
  exposureId: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "diagnosed");
  const revisionId = input.aggregate.session.confirmedRevisionId;
  const gapId = input.aggregate.session.primaryGapId;
  if (!revisionId || !gapId) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "exposure_committed", {
    ...input.aggregate.session.stateData,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      "smallest_scaffold_exposure_committed_before_help",
    ],
  });
  return {
    ...plan,
    assistanceLevel: 1,
    exposure: {
      exposureId: input.exposureId,
      revisionId,
      gapId,
      assistanceLevel: 1,
      scaffoldKind: "smallest_eligible_scaffold" as const,
      occurredAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairSubmission(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, ["exposure_committed", "partial"]);
  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const retryingPartial = input.aggregate.session.state === "partial";
  const submissionCount = trustedRepairSubmissionCount(input.aggregate);
  if (
    (retryingPartial && !trustedRepairPartialRetryAvailable(input.aggregate)) ||
    (!retryingPartial && submissionCount !== 0)
  ) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "repair_submitted", {
    ...input.aggregate.session.stateData,
    continuation: null,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      retryingPartial
        ? "bounded_partial_retry_submission_committed"
        : "learner_reconstruction_committed",
    ],
  });
  return {
    ...plan,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber: input.aggregate.session.stateData.revisionNumber,
      kind: "repair_submission" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

function primaryAnchorSatisfied(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  repair: TrustedRepairPrivateArtifact;
}) {
  const primary = input.aggregate.session.stateData.gapCandidates.find(
    (candidate) => candidate.gapId === input.aggregate.session.primaryGapId,
  );
  const anchor = input.fixture.anchors.find(
    (candidate) => candidate.anchorId === primary?.anchorId,
  );
  if (!anchor) return false;
  const [evidence] = anchorEvidence(input.repair.body, {
    ...input.fixture,
    anchors: [anchor],
  });
  return evidence.satisfied;
}

export function planTrustedRepairContinuation(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
  continuation: TrustedRepairContinuation;
  exposureId: string;
  occurredAt: string;
}) {
  const permittedStates: TrustedRepairState[] = [
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
    "partial",
  ];
  guardState(input.aggregate, permittedStates);

  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }

  if (input.continuation === "DEFER_FOR_NOW") {
    const plan = basePlan(input.aggregate, "deferred", {
      ...input.aggregate.session.stateData,
      continuation: input.continuation,
      resultReasonCodes: [
        ...input.aggregate.session.stateData.resultReasonCodes,
        "learner_deferred_without_success_evidence",
      ],
    });
    return { ...plan, outcome: "deferred" as const };
  }

  if (input.continuation === "SWITCH_TO_GUIDED") {
    const revisionId = input.aggregate.session.confirmedRevisionId;
    const gapId = input.aggregate.session.primaryGapId;
    if (!revisionId || !gapId) {
      throw new TrustedRepairContractError("invalid_transition");
    }
    const plan = basePlan(input.aggregate, "guided", {
      ...input.aggregate.session.stateData,
      continuation: input.continuation,
      resultReasonCodes: [
        ...input.aggregate.session.stateData.resultReasonCodes,
        "guided_mode_has_zero_independent_success_effect",
      ],
    });
    return {
      ...plan,
      outcome: "guided" as const,
      assistanceLevel: 3,
      exposure: {
        exposureId: input.exposureId,
        revisionId,
        gapId,
        assistanceLevel: 3,
        scaffoldKind: "guided_solution" as const,
        occurredAt: input.occurredAt,
      },
    };
  }

  guardState(input.aggregate, "repair_submitted");
  const repair = latestTrustedRepairArtifact(
    input.aggregate,
    "repair_submission",
  );
  if (
    !repair ||
    repair.revisionNumber !== input.aggregate.session.stateData.revisionNumber
  ) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const sourceBlocked =
    input.fixture.sourceBinding.requiredStatus === "current_law_verified" &&
    !trustedRepairLawReleaseEligible(input);
  const criterionPassed = primaryAnchorSatisfied({
    aggregate: input.aggregate,
    fixture: input.fixture,
    repair,
  });
  const independentBoundaryPassed =
    input.aggregate.session.independentAttemptBeforeHelp &&
    input.aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    );
  const nextState = sourceBlocked
    ? ("blocked" as const)
    : !independentBoundaryPassed
      ? ("guided" as const)
      : criterionPassed
        ? ("verified" as const)
        : ("partial" as const);
  const plan = basePlan(input.aggregate, nextState, {
    ...input.aggregate.session.stateData,
    continuation: input.continuation,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      ...(sourceBlocked ? ["law_source_currentness_unverified"] : []),
      ...(criterionPassed
        ? ["same_session_primary_criterion_passed"]
        : ["same_session_primary_criterion_not_yet_passed"]),
      "no_mastery_transfer_stability_score_or_pass_claim",
    ],
  });
  return { ...plan, outcome: nextState };
}

export function planTrustedRepairRevisionDrift(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, [
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
    "verified",
    "partial",
    "guided",
    "deferred",
    "blocked",
    "uncertain",
  ]);
  const revisionNumber = input.aggregate.session.stateData.revisionNumber + 1;
  const plan = basePlan(input.aggregate, "stale", {
    ...input.aggregate.session.stateData,
    revisionNumber,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    continuation: null,
    resultReasonCodes: [
      "revision_drift_invalidated_anchor_diagnosis_and_verification",
    ],
  });
  return {
    ...plan,
    confirmedRevisionId: input.artifactId,
    primaryGapId: null,
    outcome: "stale" as const,
    assistanceLevel: 0,
    independentAttemptBeforeHelp: false,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber,
      kind: "confirmed_revision" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}
