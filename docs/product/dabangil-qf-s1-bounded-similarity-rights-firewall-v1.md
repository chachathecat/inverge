# 답안길 QF-S1 bounded similarity / rights firewall v1

QF-S1 is an inert, source-only protective inspection boundary. It accepts one
validated QF-0 `QUARANTINED` candidate, a bounded set of ephemeral candidate
body parts and one closed, metadata-bound reference corpus. It emits only a
deterministic `SimilarityFirewallReviewV1` containing digests, opaque
identifiers, counts, bounded-work totals and token-index match metadata.

QF-S1 grants no source, commercial-use, generation, blueprint, transfer,
release, learner or bank right. A `CLEAR` review means only that the complete
declared corpus was inspected within the frozen machine limits without
blocking or review evidence. It cannot establish source eligibility or make a
candidate releasable.

## Final-branch reconstruction identity

The final candidate branch is
`codex/qf-s1-bounded-similarity-rights-firewall-v1`, created directly from
refreshed protected `main` SHA/tree
`4503afc74cf782c18437d6c5031541ef9786eed9` /
`b5d3596ebebc50142b01a63d731a4951288d1499`. The validated QF-S2
resulting-main receipt satisfies only the required publication sequence; QF-S1
does not consume a QF-S2 runtime, contract or authority.

The six prepared source files were mechanically recreated from audited local
scratch commit `d9b2a8e5e3343850f7dbb5233750acce3821a1cc`. Neither that scratch
commit nor any donor history is an ancestor of the final candidate. Remote
publication and PR creation remain pending final exact-head evidence.

## Exact QF-0 dependency

The firewall consumes the merged QF-0 result at SHA/tree
`7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2` /
`9ad60b9ece4931d7172cdc0462e079ed8d9a53fa`. The dependency receipt freezes:

- aggregate QF-0 config SHA-256
  `34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993`;
- QF-0 six-path identity
  `sha256:4452ad1a5e28bcba5409081a366e1d615db46bb20bc9bfae1c9381e49ea038aa`;
- candidate-contract and candidate-core implementation SHA-256 values
  `9ff5f6ebdf0e2700591a789dacd096643406c445541b07898ba10559b202ff05`
  and
  `c122e610734b6e51fd68b8e821838cac225130d30cddf7723127d9bd78d15452`;
- the exact QF-0I export surfaces and source-only boundary receipt digest
  `sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7`.

Every inspection invokes `assertQuarantinedQuestionCandidateV1`. QF-0A1
canonicalization, digest construction and UTF-8 byte ordering are used for
all QF-S1 manifests, identities, deterministic ordering and the final review
digest. Dependency or candidate identity drift fails closed.

## Ephemeral body closure

Each input body part has exactly `partId`, `partKind`, `bodyDigest` and
`bodyText`. The closed kinds are:

- `QUESTION_STEM`;
- `QUESTION_OPTION`;
- `SUPPORTING_MATERIAL`;
- `ANSWER_BODY`;
- `EXPLANATION`;
- `RUBRIC`.

The supplied SHA-256 must equal the exact UTF-8 body bytes. Parts are ordered
by QF-0A1 UTF-8 order after duplicate part IDs are rejected. The resulting
candidate body-manifest digest must equal the QF-0
`candidateContentDigest`; this cross-binding prevents a valid candidate
identity from being paired with different inspection bytes.

All array counts and all body string lengths are validated before hashing or
normalization begins. Proxies, accessors, symbol keys, sparse arrays, custom
prototypes, unknown fields and unsupported shapes fail closed. Body text is
never returned, logged or retained in the artifact.

## Closed protective corpus

Every reference binds an opaque `qfsr_` plus 64-hex digest ID, exact version,
purpose, source class,
ordered body-part manifest, manifest digest and derived reference digest. The
closed purposes are `PROTECTED_EXPRESSION_GUARD`, `PRIVATE_SOURCE_GUARD`,
`EXISTING_BANK_DUPLICATE_GUARD` and `CURRENT_BATCH_DUPLICATE_GUARD`.

The source-class vocabulary is the exact merged QF-0A2 vocabulary, including
private, textbook/commercial, unknown and blocked sources. It is metadata for
protective comparison only. A protected, private or textbook reference may
cause `BLOCKED`; its presence can never grant reuse or any other right.

Reference order is erased by reference digest and opaque ID. The corpus
manifest binds corpus ID/version and the exact ordered reference metadata.
Body or manifest drift fails closed.

## Bounded scanner and work accounting

The tokenizer is a deterministic code-point scanner, not an unbounded whole-
body regular-expression pass. After all original body count and character
limits are established, it NFKC-normalizes and case-folds each already bounded
whole body so composed and decomposed canonical sequences cannot split into
different lexemes. The normalized output is separately bounded before the
scanner validates surrogate pairs and forms lexical and numeric tokens. At
most 256 tokens are retained per body. Punctuation and whitespace are
separators. Process locale is never consulted.

Machine-owned limits are 16 candidate parts, 64 references, 16 parts per
reference, 32,768 original and normalized UTF-16 code units per body,
262,144 aggregate original and normalized code units in each separately
accounted traversal, 65,536 generated lexical windows, 524,288 comparison
units and 1,048,576 total work units. Caller override is absent.

Every reference incurs 64 work units even when it is short, unchanged or
cannot enter a matching mode. Original normalization-input characters and
normalized scanner-output characters are published as distinct totals and
both are charged, as are observed tokens, generated windows and comparisons.
Count, original/normalized character or
per-body token overflow throws before an unsafe artifact can be created. If
the window/comparison budget is exhausted, no uncharged operation is
performed and the result cannot be `CLEAR`; it is `REVIEW_REQUIRED` unless
blocking evidence has already been established.

## Deterministic protective coverage

The firewall covers exact normalized copying, near-whole copying, both
fragment-containment directions, numeric substitutions, bounded identifier
or name substitutions, bounded token-order perturbations, lexical-only
transformed copies with sufficient retained evidence and copies spanning
structured parts. Each blocking or review match contains only the opaque
reference identity, part kinds, a closed match kind, integer measure,
token-index ranges, closed transformation flags and disposition.

Strong-copy decisions require at least eight tokens, six non-generic lexical
tokens and five distinct non-generic lexical items. Lexical transformed
matching also requires the frozen coverage threshold and either a shared
five-token lexical window or at least eight common distinct lexical items.
Consequently, numeric layout alone, unrelated calculations, short generic
phrases and low-diversity repeated expressions cannot produce a blocking
decision.

This is not semantic plagiarism detection. It documents a deterministic,
bounded protective coverage envelope and makes no claim outside that
envelope.

## Review outcome and non-authority

The outcomes are closed:

- `BLOCKED` for exact or strongly supported near-copy evidence;
- `REVIEW_REQUIRED` for ambiguous threshold evidence or an incomplete
  budget-bounded comparison;
- `CLEAR` only after complete declared-corpus inspection with no blocking or
  review evidence.

The review digest binds the candidate ID/digest, candidate body-manifest,
policy reference/digest, corpus manifest, corpus counts, exact work totals,
outcome and complete ordered match set. Altering any bound metadata or token
range invalidates assertion of the review.

QF-S1 performs no provider execution, network request, database or
persistence action, remote or Production mutation, API/UI work, release,
learner assignment or bank assignment. QF-S2 is an independent sibling.
QF-S3 and QF-I1 remain unstarted.
