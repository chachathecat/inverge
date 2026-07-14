# S228 Study Ledger v3 Runtime QA

Status: source implementation complete; exact-head CI and authenticated browser evidence pending.

## Scope

- Route: /app/items/[itemId]?mode=second
- Mobile reference: Figma file jcOKSi2WwhDOAfV2xMv9gO, node 56:2
- Desktop reference: Figma file jcOKSi2WwhDOAfV2xMv9gO, node 59:62
- Implementation issue: #559
- Branch: agent/s228-study-ledger-v3-detail

This vertical slice changes presentation only. It does not change database schemas, migrations, APIs, payments, instructor surfaces, or the persisted review contract.

## Runtime mapping

- 가장 큰 간극: buildDetailStudyNote().missingIssue, then weakPoint
- 다음 행동: rewriteInstruction, then nextAction
- 학습자 근거: non-empty rewriteParagraph, then non-empty userAnswer
- 참고용 근거: non-empty referenceStructure, then non-empty correctAnswer
- 완료: explicit rewriteCompleted or an existing rewrite comparison
- 근거 충돌: explicit evidence_conflict boolean only; prose is never guessed as conflict
- 다음 복습: existing note date and review queue count
- 보조 경로: existing rewrite comparison, calculator link, Review, another answer, reference hints, taxonomy candidate, and feedback remain reachable

## State coverage

| State | Source contract | Runtime behavior |
| --- | --- | --- |
| Loading | route loading.tsx | Polite busy state; no false progress |
| Empty / not found | route not-found.tsx and empty evidence rail | Returns to Study Ledger with one clear action |
| Error | route error.tsx | Recoverable retry; error details are not logged into learner artifacts |
| Offline | navigator.onLine in the error boundary | Offline copy appears only when the browser reports offline |
| Evidence conflict | explicit evidence_conflict flag | Alert semantics and cautious comparison copy |
| Completed | rewriteCompleted or rewrite comparison | Saved comparison, remaining gap, and next review remain visible |

## Pull request contract

The PR must keep the repository-required Goal, Non-goals, Risk classification, Data boundary, Schema/API/environment, Tests and evidence, Runtime evidence, Rollout and rollback, Remaining risks, and Merge recommendation sections. Exactly one risk level and one merge recommendation are selected.

## Acceptance matrix

| Check | Target | Current status |
| --- | --- | --- |
| Source-level contract | node --test tests/s228-study-ledger-v3-runtime.test.mjs | Must pass on exact PR head |
| Type check | npm run typecheck | Must pass on exact PR head |
| Lint | npm run lint | Must pass on exact PR head |
| Full suite and build | npm test and npm run build | Must pass on exact PR head |
| Preview deployment | Latest PR head | Must be Ready with no observed route errors |
| Mobile visual | Authenticated 390px detail | Not captured |
| Desktop visual | Authenticated 1440px detail | Not captured |
| Keyboard and focus | Back link, disclosures, primary action, retry | Not verified in browser |
| Screen reader landmarks | shell main, article, header, sections, evidence aside | Source implemented; browser check pending |
| Durable transition | rewriteFrom to capture to saved comparison | Not verified with an authenticated account |

## Honest release gate

This document is not proof of a world-class shipped experience yet. S228 becomes review-ready only after the exact-head CI checks are green and authenticated 390px and 1440px screenshots, keyboard navigation, zero console/page errors, and the durable rewrite transition are attached to the pull request. Device-specific GIII instructions remain outside this PR and remain unverified until real-device validation.
