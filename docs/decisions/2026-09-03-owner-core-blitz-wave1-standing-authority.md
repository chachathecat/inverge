# Owner Core Blitz Wave 1 appraiser-first standing authority

- Original decision date: 2026-09-03
- Appraiser-first rescope date: 2026-09-04
- Parent authority: Issue #880
- Sole integration PR: PR #882 (originally Draft; current state is live GitHub)
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
subject, route, review-unit ordinal and exact D+1 due-time bindings agree. A
later or immediate review unit may not be relabeled as the first D+1. The Queue row is
reused and is never inserted or updated by the adapter. Identical retry reuses
the same deterministic journey and Queue identity. Missing Queue or any
binding drift fails closed.

The production APP-1 request supplies no schedule authority. The server uses
the canonical Review OS scheduler and one immutable scheduling reference to
derive the first-recurrence D+1 date and UTC due time, then seals that exact
binding into the resumable replay plan used to create or reuse the canonical
Queue row. The APP-1 to C3R adapter accepts only the same sealed Queue identity
and due time. A client-authored override, a non-first recurrence or any drift
between replay plan, Queue and journey fails closed before handoff.

The first recurrence belongs to this specific repair, not to the learner's
cumulative topic/mistake history. The server seals `reviewUnitRecurrenceCount: 1`
while preserving the independent accumulated `recurrenceCount`; existing topic
history is never reset and ordinary Review OS recurrence policy is unchanged.
Each new repair receives its own canonical first D+1. Partial-save, completed-save
and simultaneous identical retries reuse the persisted winner's sealed plan,
item, Queue, learning signal and journey. Legacy sealed plans are validated
without rewriting their authority or erasing their prior history.

The 2026-09-06 Owner continuation permits corrections and regression corrections
only for this APP-1 P1 and its directly coupled save, schedule and retry paths,
including a scoped exception to source-correction and review-cycle counts.
The resumed live head is `5e9858a808a4dbb9f042725cbee8d02ce78e1155`, tree
`6163b521d50b75cf1ce679117fb70184d6804108`. This exception changes no general
delivery policy, adds no feature scope and authorizes no Ready or merge action.

The 2026-09-06 Owner continuation for review `5124482243`, starting at head
`f22627dca19ca8a758f17f5495be2364db5800e6`, tree
`d7b1112c0f7a3cfaf9ef37b96f325436c3933ad8`, authorizes only the completed-Queue
retry P2 and its directly coupled state-consistency and regression corrections.
Its correction/review-count exception changes no general delivery policy.
Current Ready/Open status is preserved; the prior merge approval is invalid for
the corrected head. Final exact-head checks, clean review and zero unresolved
threads precede requesting a new head/tree Owner merge approval and stopping.

Replay validates a pending or completed Queue's immutable bindings without
changing its status. The bodyless journey stores only the immutable repair-to-D1
link, not a second current Queue state or a promise of a future task. An exact
legacy awaiting-D1 projection is normalized in place under compare-and-swap;
unknown or conflicting metadata fails closed. Original identities, D+1 due
time, creation time and independent historical APP-1 signals are preserved.
Previously returned H0 receipts remain historical observations, not current
visibility authority. No new database schema, ledger or review state machine
is introduced.

After the durable link write/recovery, all Queue bindings and current status
are re-read. A pending snapshot alone may materialize the unchanged H0 contract.
A completed Queue, with or without an existing journey, instead returns
`APP1_C3R_D1_ALREADY_COMPLETED`, `currentPending: false` and its original D+1
identity, without an H0 receipt or a new pending review unit. The API is no-store
and the learner screen confirms the saved record and already processed review,
without promising another review or asking the learner to repeat a successful
save. Queue processing completion never certifies learning success. The Queue
and its existing pending-only list remain the sole current-state authority.

Rollback is fail-closed through the existing Owner/subject default-off access
gates. Reverting to the defective adapter is not a safe way to continue serving
this path: it cannot consume the normalized link or truthfully report completed
retries. No flag is changed here, and no data deletion, migration, history
rewrite or remote operation is part of rollback evidence.

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

The HTTP selector supports only `LEARNING_PRACTICE` requests and
`LEARNING_PRACTICE` / `LEARNING_ONLY` candidates. `D7_TRANSFER` and
`TIMED_MEASUREMENT` requests, including empty-stock requests, are explicitly
rejected with HTTP 403 before selector execution. Nested certified bank or
content authority is also rejected, even under a learning purpose or alongside
eligible learning stock; it is not silently discarded or relabeled successful.
Release/sealed-unseen/family-isolation/timed-protocol assertions must be false,
calibration must be `UNASSESSED`, and chronology/chronology authority must be
null on this route. A self-consistent client-authored QF-S3 graph cannot
authorize certified selection.

The route is a non-persistent learning-only metadata selection. Client
rights/source values remain required, unverified caller assertions and are
neither repaired nor returned as server-verified facts. The response explicitly
labels that trust boundary. No reference content is fetched or released, no
server-side certified-authority integration is added, and the existing internal
certified-bank code and validators remain unchanged and unreachable from this
HTTP path. The restriction precedes selection; it is not an output-flag rewrite.

The preceding 2026-09-06 Owner continuation authorized only review `5124412945`'s
QF client-authority P1 and directly related regressions, starting at head
`63ac700afa5da1a59e6b316c4a6c2ffdbcc6cbe6`, tree
`b1267f745031af830b4c603cf8732d279e7268bf`. Its correction/review-cycle exception
changes no general repository policy. The earlier Ready/squash approval cannot
authorize the corrected head. Keep the current Ready state without toggling;
after exact-head checks and review pass, request a new head/tree Owner merge
approval and stop. An automatic new-head review must not be duplicated manually.

The QF-I1 selector independently requires the server-only
`CORE_BLITZ_QF_I1_ENABLED` condition (missing or anything other than `true`
is OFF), followed by the existing authenticated trusted-repair Owner/subject
allowlists. Auth-disabled and demo sessions are denied. Existing C3R flags
alone cannot enable QF. The existing learner-support deployment convention is
preserved: `VERCEL_ENV=production` is always denied; `NODE_ENV=production`
is denied unless `VERCEL_ENV=preview`. Local development/test and Vercel
preview can exercise the route only with the explicit QF and existing access
conditions. Access denial occurs before any body read or selector execution.
This declaration enables no local or deployed flag: allow/deny validation
injects isolated test configuration only.

The request limit remains 65,536 received bytes. Content-Length may reject
early but never authorizes an unbounded read. The route accumulates actual
stream bytes in a bounded buffer, cancels reading at the first excessive
chunk and returns HTTP 413 without waiting on transport cleanup. Only an
in-limit complete body is decoded, JSON-parsed and passed to existing input
validation. Missing, malformed and understated length headers do not bypass
the limit; UTF-8 and split chunks are counted in bytes, not characters.
Every response is private/no-store; errors carry only fixed codes, no raw
input or exception text.

The 2026-09-06 Owner continuation authorizes the two QF-I1 findings in review
`5124107547` and directly coupled regression correction/validation only,
starting at head `697456703b5e45e1197d432e5e93d87e5f496dbd`, tree
`8545f5c90a3608bbf703284717cce9679af0d575`. Its correction/review-cycle
exception does not change general repository policy or authorize unrelated
features, real environment activation, Ready or merge. Existing APP-1
cumulative history, per-repair D+1, resumability and concurrency stay intact.

Eligible bank stock is always preferred. Generation is authorized only for a
Learning Practice gap, and generated content has maximum authority
`LEARNING_ONLY`. Generated origin cannot be admitted to Verified Transfer
or Measurement. Assignment, exposure, generation request, retry and conflict
identities are deterministic and idempotent.

Provider execution, public learner activation and raw generated body
persistence in metadata-only stores remain off. Bank reads are scoped by
exact exam mode and subject in the existing internal persistence adapter, not
this non-persistent HTTP selector. Internal Verified Transfer and Measurement
candidates must pass the existing QF-S3 chronology validator against their
complete authority input. QF-S3 proves consistency of supplied metadata only;
it does not certify client rights, source, release or calibration claims.
Metadata-only persistence stores only a content-addressed opaque
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

PR state remains as found on live GitHub, with no Draft/Ready toggling in this
correction. This authority grants no further Ready transition, merge,
auto-merge, force push, replacement PR, new remote branch, Production/public
activation, remote Supabase/database mutation, migration/RLS/auth change,
payment/entitlement change, provider execution or use of real learner data.

The stop condition is `CORE_BLITZ_WAVE1_DRAFT_READY_FOR_OWNER`.
