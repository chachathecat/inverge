# S232E.3 Answer Review entry IA

## Evidence boundary

The connected Figma V3 file contains no Answer Review entry, answer editor, upload panel, or responsive Answer Review frame. S232E.3 therefore makes **no pixel-parity claim**. It aligns the existing Answer Review entry with the observed V3 staged-flow language, typography roles, semantic tokens, and progressive-disclosure pattern without inventing a Verified, Confirmed, Official, evidence-count, or grading-authority state.

The implementation is learner-first: the default entry exposes answer snap and answer text, keeps the learner answer required, and leaves the single start action disabled until an answer exists. Problem/case material, reference material, files, and explanation level remain available inside one closed `정확도 높이기 (선택)` disclosure. The existing Answer Review service, Problem Snap handoff, anonymous-trial, authenticated-session, subject, file, state, and test contracts are preserved.

## Runtime acceptance

The branch-scoped exact-head gate authenticates with the dedicated test account and then opens `/answer-review?mode=second`. It checks one already-rendered document at 390px, 768px, and 1440px by viewport resizing, not by three independent navigations. Before and after the assertions, the runtime deployment endpoint must report the exact PR-head SHA used by the runner.

The gate verifies:

- exactly one V3 screen-role `h1` and one labelled primary Answer Review surface
- the `지금 → 왜 → 결과` definition order
- exactly two default entry actions: answer snap and answer text
- one visible required answer input that remains empty throughout the run
- exactly one visible primary start action, disabled while the answer is empty
- one closed optional-accuracy disclosure whose nested inputs are hidden by default
- real Tab navigation and a computed `:focus-visible` style delta on the default action, required answer control, and optional disclosure
- local open/close of the disclosure without activating a learner action
- at most 1px horizontal overflow and zero Axe serious/critical violations
- zero console errors, page errors, unexpected same-origin request failures, and post-render same-origin non-read requests
- stable browser-storage digest and analytics-array lengths

The gate does not type, paste, upload, snap, submit, structure, grade, save, or navigate through a learner action. It does not claim that the API result, persistence path, later stages, database contents, or Problem Snap transition were exercised. Existing authenticated render paths may perform server-side session or profile access, so the artifact **does not claim total database immutability**.

## Artifact privacy contract

The only uploaded artifact is one flat scalar JSON document. It records bounded counts, booleans, and the three exact commit SHAs. It contains no credential, email, learner answer, problem text, reference text, subject, URL, DOM, screenshot, trace, video, file, OCR content, or nested object. Browser storage is compared as a one-way in-memory digest; neither storage keys nor values leave the browser.

The workflow rejects unknown or nested evidence fields, missing privacy flags, SHA disagreement, URL-like or email-like text, additional artifact files, and any failed acceptance value. Secrets are scoped only to the steps that need them and are never placed in the job-level environment.

## Rollback

One revert removes the S232E.3 source selectors, entry presentation, source contract, runtime spec, workflow, and this QA boundary. No schema or data rollback is required.
