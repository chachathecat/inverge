# Owner Core Blitz Wave 1 appraiser-first standing authority

- Original decision date: 2026-09-03
- Appraiser-first rescope date: 2026-09-04
- Parent authority: Issue #880
- Sole integration PR: Draft PR #882
- Existing remote branch: `codex/issue-880-core-blitz-wave1`
- Starting live PR head: `36bac9ef30c456248283275d2560bc036438b501`
- Starting live PR tree: `5ac03c17941d2386a365de5676d0bec687a8e8bb`
- Runtime impact of this decision artifact: none

## Decision

PR #882 is the sole integration PR for the appraiser second-stage Wave 1
mainstream. Its remaining completion scope is exactly:

1. authenticated synthetic APP-1 to C3R persistence acceptance against an
   isolated local database;
2. one canonical authenticated appraiser second-stage learner-support route
   entered from the stored-item Study Ledger flow;
3. the smallest QF-I1 bank-first, generation-on-learning-gap,
   `LEARNING_ONLY` boundary.

No appraiser first-stage Subject Adapter begins in PR #882. After PR #882 is
merged, the next milestone is the appraiser first-stage five-subject learner
loop. This decision does not start that milestone.

## Seven Exams disposition

`SEVEN_EXAM_PRE_T0_SOURCE` is not an active PR #882 lane.
`SEVEN_EXAM_DOSSIER_AND_SOURCE_PREPARATION` is not an active PR #882 node.
Seven Exams packet or source readiness is not a PR #882 completion gate.

Seven Exams is parked until all three of these milestones are complete:

1. appraiser second-stage mainstream completion;
2. appraiser first-stage five-subject completion;
3. combined appraiser first/second-stage connection.

PR #882 collects no Seven Exams sources, creates no Seven Exams runtime and
creates no separate Seven Exams PR.

## APP-1 acceptance boundary

APP-1 repair may materialize one bodyless C3R journey projection only after
the existing user-owned Review Queue row is loaded and its item, revision,
subject, route, recurrence and exact D+1 due-time bindings agree. A later,
immediate or repeated recurrence may not be relabeled as D+1. The Queue row is
reused and is never inserted or updated by the adapter. Identical retry reuses
the same deterministic journey and Queue identity. Missing Queue or any
binding drift fails closed.

APP-1 repair creates neither mastery nor transfer Evidence. Raw answer,
question, OCR, prompt and learner bodies remain outside derived metadata.
Acceptance uses synthetic Owner data and an isolated local database only,
then removes the synthetic user, records and container.

## Learner-support boundary

The only authenticated learner-support route is
`/app/items/[itemId]/support`, linked from the appraiser second-stage stored
item and Study Ledger flow. It is Owner-only, default-off, unavailable in
Production, and requires both `ALPHA_ADMIN_EMAILS` and the dedicated
`CORE_BLITZ_LEARNER_SUPPORT_OWNER_EMAILS` allowlist while
`CORE_BLITZ_LEARNER_SUPPORT_ENABLED=true`. Its choices are:

- 내가 먼저 풀기
- 힌트 하나
- 1타 쉬운풀이
- 전체풀이
- 정답만 보기

Only `내가 먼저 풀기` is unaided. Every assisted path is ineligible for
same-item mastery and transfer Evidence and requires a separate later unaided
attempt. An authoritative answer or full solution is unavailable without a
supplied verified learning-reference authority. The stored wrong-answer
`correctAnswer` field is learner/OCR material and is never that authority.
The initial page and RSC payload contain only choice metadata and item content
safe before assistance recording; no assistance draft or projection is passed
to the client. The server durably records the exact selected exposure before
it constructs the hint, easy explanation, step-by-step explanation, full
solution or direct-answer projection. A failed write returns and caches no
assisted content. A successful response is private and non-cacheable and
contains only the selected projection. A same-choice retry reuses its event
identity and the first stored chronology; it never creates a second exposure
or broadens the returned projection.

## QF-I1 boundary

Eligible bank stock is always preferred. Generation is authorized only for a
Learning Practice gap, and generated content has maximum authority
`LEARNING_ONLY`. Generated origin cannot be admitted to Verified Transfer
or Measurement. Assignment, exposure, generation request, retry and conflict
identities are deterministic and idempotent.

Provider execution, public learner activation and raw generated body
persistence in metadata-only stores remain off. Bank reads are scoped by
exact exam mode and subject. Verified Transfer and Measurement candidates
must pass the existing authoritative QF-S3 chronology validator against their
complete authority input; caller labels, actors, receipts and digests are not
trusted. Metadata-only persistence stores only a content-addressed opaque
authority reference and digest, never the authority input. Certified rows are
usable only after a server-injected authority resolver rehydrates the complete
input, verifies the reference digest and re-runs the authoritative QF-S3
validator. Missing, stale or mismatched authority fails closed. Candidate bank
class and availability eligibility are applied before any truncation, and both
candidate stock and the complete exact-learner exposure history are read with
stable, deterministic pagination before assignment eligibility is decided.

## Validation and delivery

The complete candidate runs focused tests, typecheck, changed-file lint, JSON
validation, diff inspection, affected learner-loop suites, build, exact-head
GitHub checks, one representative authenticated runtime acceptance and
exactly one fresh formal review when no exact-head review exists.

The Draft PR remains Draft. This authority grants no Ready transition, merge,
auto-merge, force push, replacement PR, new remote branch, Production/public
activation, remote Supabase/database mutation, migration/RLS/auth change,
payment/entitlement change, provider execution or use of real learner data.

The stop condition is `CORE_BLITZ_WAVE1_DRAFT_READY_FOR_OWNER`.
