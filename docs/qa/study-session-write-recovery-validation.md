# Private-session write-result recovery — Issue #919

Scope: make the EXISTING same-request recovery action reachable when a POST
response never finishes. Five-subject/reviewed Bank/Owner-trial UI and actual
route/store behavior remain one outcome. No server API, schema, dependency,
flag, content, approval, scheduling or data-policy changes.

## Reproduction and correction

The real React/HTTP Bank fixture failed before the fix: after durable save and
partial JSON, client waiting remained unbounded and the retry button never
appeared. A 15-second AbortController deadline now covers headers and JSON body.
It cancels only client waiting, never promises server rollback, and preserves
the original in-memory command for explicit user retry. The timeout message
states that server saving may continue. No automatic second POST or optimistic
question/explanation/recap is emitted. The existing server CAS/replay validation
remains authoritative, including after navigation or a late original request.

The synthetic HTTP fixture holds actual successful responses before headers and
after partial JSON. Another case buffers the received original request, lets its
retry complete, then executes the original through the same parser/service/store.
Request bytes and returned durable view must match; no new selection, timestamp,
identity or D+1 is manufactured. Unknown views disclose no question or assistance.
Existing failed-write replay, Bank lost-create/reload, subject navigation,
completed-review preservation and zero browser storage/external requests remain.
Browser-only virtual time is not OS/server/source-expiry or actual next-day time.

One initial fixture assertion captured the preceding create URL before its UI
transition finished; sampling after the held new request arrives fixes this
test synchronization issue. It does not change production URL behavior.

## Evidence status

- Targeted actual React/loader/HTTP with synthetic memory: red before correction,
  green after correction. First-stage affected suite 204/204 passes.
- Final first-stage affected 204/204, authoritative QF-I1/QF-S3 85/85 and separate
  subject-navigation/all-five-blocker browser 2/2 pass. Typecheck, changed lint,
  build (54/54 static pages), 162 tracked JSON and four-path manifest/diff pass.
  The same unchanged locked install is used; no dependency drift or reinstall.
  Six existing broad-tracing build warnings remain. Audit critical/high/moderate
  0, existing low 1, no exception. Actual scan of 191 NFT manifests/149,673 entries
  found no actual private roots or local environment files; static key markers 0.
  Final synthetic saved-response/completion screen was visually inspected, not
  claimed as authenticated personal Next runtime evidence. Native gates pending.
- Mandatory Linux Full CI runs the strengthened shared fixture across its eight
  actual PostgreSQL/SDK/HTTP/React cases; Windows and all native checks still gate.
- Docker control preflight remains unavailable locally; no repeated unchanged
  failed probe, personal DB substitution or inspection bypass. Owner-PC refresh
  is separately incomplete, not synthetic runtime evidence.
- #918 checks/review/main are prior evidence, not this candidate's results.

## Exact changed-path manifest

1. `components/review-os/first-stage-private-practice.tsx`
2. `tests/fixtures/first-stage-private-browser-harness.mjs`
3. `docs/exec-plans/active/inverge-owner-study-os.md`
4. `docs/qa/study-session-write-recovery-validation.md`

## Boundaries and rollback

Same post-#909 A/B/C authority and sole writer. Existing reviewed approvals 0,
Bank OFF, Owner-PC unreviewed exception unchanged; no additional content or mode.
Preview paths must remain app-denied and Production auto-build suppressed under
authenticated read-only inspection. No secrets/settings/provider/payment/remote
DB apply or personal data deletion. Original sources105 and records preserved.
An ordinary reviewed source revert restores the prior wait behavior, with no
durable data rollback or delete. Conditional merge requires fresh exact-head
native checks, independent actionable 0/0/0, zero threads and current base/rules.
