# QF-S1 bounded similarity and rights firewall v1

QF-S1B completes the source-only QF-S1 firewall by consuming the exact
merged QF-S1A mandatory-preparation receipt. Its public entrypoint accepts
only `SimilarityCorpusPreparationInputV1` and calls
`prepareSimilarityCorpusV1` exactly once. Callers cannot submit a prepared
corpus as authority.

The public assertion requires that same original closed preparation input. It
recomputes the authoritative review through the sole QF-S1A-backed creation
path and accepts the supplied metadata artifact only when its canonical bytes
match the recomputed result. A caller-recomputed unkeyed digest proves only
self-consistency and cannot establish that inspection occurred.

The firewall retains no raw body. QF-S1A validates body digests, Unicode,
closed manifests, corpus identity and all mandatory work before QF-S1B begins
optional matching. QF-S1B consumes only QF-S1A's bounded prepared tokens,
sequence digests, opaque identities and immutable accounting.

## Execution order

The order is fixed:

1. complete QF-S1A mandatory preparation;
2. inspect every canonical reference for exact normalized sequence evidence;
3. run comparison-first detectors for the current reference;
4. generate bounded lexical windows for that reference only when needed;
5. move to the next canonical reference;
6. create one metadata-only `SimilarityFirewallReviewV1`.

No lexical window is created before the exact-copy prepass completes. The
firewall never prepares windows for the complete corpus in advance.

An exact match is recorded immediately. Once blocking evidence exists it
cannot be erased or downgraded by later clean references, ambiguous evidence
or budget exhaustion. `BLOCKED` with `budgetExhausted: true` and
`completeCorpusInspection: false` is therefore valid and truthful.

## Coverage and limits

The deterministic detectors cover exact normalized copy, structured copy,
strong whole-body and fragment copy, numeric substitution, bounded
identifier substitution, bounded token-order displacement and lexical
transformation with minimum distinct evidence. They do not claim semantic
plagiarism detection.

Optional work is capped by all three of:

- QF-S1A `remainingOptionalWorkUnits`;
- 65,536 generated windows;
- 524,288 comparison work units.

Each generated window and comparison/alignment/containment/order/overlap
operation is charged. Optional work is never reset per reference. Mandatory
QF-S1A accounting is copied unchanged into the review. The review proves:

`optionalWorkUnitsConsumed = generatedWindows + comparisonWorkUnits`

and:

`totalWorkUnits = mandatoryTotalWorkUnits + optionalWorkUnitsConsumed`.

## Outcomes

Outcome precedence is closed:

1. any blocking match produces `BLOCKED`;
2. otherwise incomplete inspection, budget exhaustion or review evidence
   produces `REVIEW_REQUIRED`;
3. only complete declared inspection with no blocking or review evidence
   produces `CLEAR`.

`CLEAR` grants no rights, generation, release, transfer, learner assignment or
bank assignment. Protected, private and commercial references may block reuse
but can never grant reuse.

## Metadata-only artifact

`SimilarityFirewallReviewV1` binds the exact candidate identity, candidate
body-manifest digest, QF-S1A preparation digest, policy identity, corpus
manifest, counts, truthful work accounting, closed outcome, metadata-only
matches and a canonical review digest.

Artifact validation is authoritative revalidation, not digest-only trust:
`assertSimilarityFirewallReviewV1` reconstructs the review from the original
ephemeral input and returns the newly recomputed immutable artifact.

Match summaries contain only opaque reference identity, part kinds, closed
match/transformation values, deterministic measures and token index ranges.
They contain no token values, body, normalized text, excerpt, prompt,
response, learner/account identity, URL or path.

## Source-only boundary

QF-S1B is inert and in-memory. Runtime activation, provider execution,
network, database, persistence, remote mutation and Production mutation are
off. Source-right, source-eligibility, generation, transfer, release,
learner-assignment and bank-assignment authority are absent. QF-S3 and QF-I1
remain unstarted.
