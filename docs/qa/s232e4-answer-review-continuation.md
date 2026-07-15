# S232E.4 Answer Review result → rewrite continuation

## Evidence boundary

The connected Figma V3 file contains no Answer Review result or rewrite frame. S232E.4 therefore makes **no pixel-parity claim**. It applies the observed V3 staged-flow language, semantic tokens, typography roles, one-dominant-task hierarchy, and quiet-disclosure pattern to the existing Answer Review controller without inventing Verified, Confirmed, Official, evidence-count, score, or grading-authority states.

After a successful structure response, the visible result now leads with one biggest gap, explains why it matters and what to rewrite, and exposes exactly one primary action into the rewrite stage. Entry-only answer-snap and text-focus actions render only during step 1. Result status, grounding, feedback, quality warnings, calculator practice, and deeper diagnostics remain available inside closed secondary disclosures. A failed structure response does not expose a successful-result rewrite action.

The rewrite stage presents the rewrite target, one instruction, and one editable paragraph before its action row. The existing clipboard action remains primary; `오늘 학습으로 계속` is a secondary navigation option. Cognitive learning actions, draft state, Problem Snap handoff, anonymous trial, authenticated session, file inputs, service endpoint, calculator behavior, and established test IDs remain available.

## Exact-head runtime acceptance

The branch-scoped gate authenticates with the dedicated test account, opens `/answer-review?mode=second`, and verifies the exact PR-head Preview SHA before and after the flow. It uses one authenticated document at 390px, 768px, and 1440px by resizing rather than opening separate documents.

To reach the successful result without sending or persisting learner content, the browser enters a fixed synthetic fixture and locally fulfills only two exact Answer Review structure requests: one success and one fixed billing-error retry. The local route requires the runtime origin, exact `/api/answer-review/structure` pathname with no query or fragment, `POST`, and a `fetch` resource. The request body is never inspected, recorded, uploaded, or sent to the application server. Every other non-read request at any origin after the baseline is blocked and fails the run. This validates the rendered result-to-rewrite continuation and stale-result clearing on a failed retry, not the production structure API, model output, entitlement accounting, learning-signal persistence, or database state.

The gate verifies:

- entry-only answer actions disappear after result creation
- one visible biggest-gap result and one visible rewrite-entry action
- result status/evidence, diagnostics/calculator, and full diagnostics are closed by default
- the rewrite heading receives transition focus
- one visible rewrite editor followed by one copy action and one secondary continue action
- rewrite guidance and input/draft status remain closed by default
- a fixed billing-error retry clears the prior biggest-gap result, rewrite action, and result disclosures
- real Tab navigation with a computed `:focus-visible` style delta
- at most 1px horizontal overflow and zero Axe serious/critical violations at all three widths for both result and rewrite stages
- zero unexpected non-read network requests, zero browser-storage changes, zero analytics-array delta, and zero console/page/same-origin request errors
- exact deployment SHA agreement before and after the local continuation

The runtime does not click copy, follow the continuation link, open calculator practice, submit result feedback, upload files, or persist a learner answer. It **does not claim total database immutability**. Authentication can perform normal session access before the read-only baseline. The locally fulfilled structure requests prove UI state handling only.

## Artifact privacy contract

The only uploaded artifact is one flat scalar JSON document. It records exact SHAs, bounded counts, and booleans. It contains no credential, email, raw learner content, synthetic fixture value, question text, reference text, subject, URL, DOM, screenshot, trace, video, file, OCR data, request body, response body, or nested object. Browser storage is compared only as an in-memory one-way digest; neither keys nor values leave the browser.

The workflow rejects unknown or nested fields, SHA disagreement, URL-like or email-like output, additional artifact files, any nonzero server-mutation or storage count, and every failed acceptance value. Secrets are step-scoped and never placed in the job-level environment.

## Rollback

One revert restores the previous Answer Review result and rewrite presentation and removes the S232E.4 selectors, source contract, runtime spec, workflow, and QA boundary. No schema, API, environment, or data rollback is required.
