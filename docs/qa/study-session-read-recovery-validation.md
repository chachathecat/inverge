# Private-session read recovery — Issue #917

Scope: existing five-subject/reviewed/Owner-trial component can recover an
indefinitely pending initial GET using its existing reload action. No new server
endpoint, dependency, schema, flag, content, durable state or mastery claim.

## Reproduction and correction

The existing reload button already works after a completed/failed read. A stalled
GET instead keeps `busy` true forever and hides it. The real component/HTTP harness
reproduced the missing button after 15 seconds of synthetic browser time. The
initial test invocation without the repository TS loader failed at bootstrap;
that was not the feature failure. Correct invocation reproduced the actual bug.

The effect now uses a 15-second AbortController deadline covering headers AND
JSON body consumption, cleared on completion/unmount. Only GET is cancelled;
mutation replay, server timestamps, content/auth decisions and URL identity stay
unchanged. Error copy distinguishes failed transport from a declared content gate.
No private content is stored in browser storage or supplied as RSC props.

The existing browser fixture adds stalled initial headers and reconnect body,
then checks the existing reload action, no question/explanation/recap while
unknown, no POST during read recovery, same URL, and unchanged saved selection,
submission time and D+1. Existing committed-write response loss, identical retry,
Bank reservation, trial separation, content refusal and completed review continue.
Only Playwright's synthetic client clock is advanced; actual OS/server/source
expiry times and real next-day observation are untouched.

## Evidence status

- Targeted actual React/HTTP/real loader with synthetic memory: red before fix,
  then both header/body-stall cases green. Final affected suite 194/194, plus
  actual subject-navigation and all-five-subject blocked-content browser 2/2.
- Typecheck, changed lint, build, 162 tracked JSON parses and exact 4-path
  manifest/diff pass. Build retained six existing broad-tracing warnings in
  unchanged files. Actual NFT root scan (191 manifests) found no private roots or
  local environment file; static output has no private-key marker. A first broad
  filename scan matched five tracked public source/docs named owner-private, not
  private material. Final synthetic browser screen was visually inspected.
- During validation the reused node_modules/junction disappeared and typecheck,
  lint and the concurrent suite failed (99 pass/6 fail, not acceptance). Once disk
  space increased, a fresh independent `npm ci --ignore-scripts` installed 457
  packages from the unchanged lock. The final tests/type/lint/build above used
  that installation; audit critical/high/moderate 0, existing low 1, no exception.
- Local PostgreSQL remains unavailable: one bounded Docker control ping after
  the disk change still timed out. No daemon restart, personal DB use or source
  deletion was performed. Prior failed/local evidence is not relabeled passed.
- Mandatory native Linux Full CI re-runs all eight isolated SQL/browser cases;
  Windows Full CI, other required native checks and exact-head review remain gates.
- #916 CI/review/main results are preserved prior evidence, NOT #917 results.

## Exact changed-path manifest

1. `components/review-os/first-stage-private-practice.tsx`
2. `tests/fixtures/first-stage-private-browser-harness.mjs`
3. `docs/exec-plans/active/inverge-owner-study-os.md`
4. `docs/qa/study-session-read-recovery-validation.md`

## Boundaries and rollback

Same sole writer/task, existing post-#909 A/B/C authority. Preview disabled paths,
actual app denial and authenticated Production build suppression remain required.
No remote/provider/settings/payment/content activation or personal schema apply.
Approved reviewed content 0; existing unreviewed-PC exception unchanged. Existing
105 originals, personal learning/planning, account/TLS/ports/volumes stay preserved.
Source revert restores the former read behavior; no data rollback or deletion.
