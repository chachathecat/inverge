# S228 Study Ledger v3 Runtime QA

Status: implementation started; authenticated browser evidence pending.

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
- 학습자 근거: rewriteParagraph, then userAnswer
- 참고용 근거: referenceStructure, then correctAnswer
- 신뢰 상태: user_confirmed_fields presence; reference content remains explicitly provisional
- 다음 복습: existing note date and review queue count

## Pull request contract

The PR must keep the repository-required Goal, Non-goals, Risk classification, Data boundary, Schema/API/environment, Tests and evidence, Runtime evidence, Rollout and rollback, Remaining risks, and Merge recommendation sections. Exactly one risk level and one merge recommendation are selected.

## Acceptance matrix

| Check | Target | Current status |
| --- | --- | --- |
| Source-level contract | node --test tests/s228-study-ledger-v3-runtime.test.mjs | Pending CI/local checkout |
| Type check | npm run typecheck | Pending CI/local checkout |
| Lint | npm run lint | Pending CI/local checkout |
| Mobile visual | Authenticated 390px detail | Not captured |
| Desktop visual | Authenticated 1440px detail | Not captured |
| Keyboard and focus | Back link, evidence disclosures, primary action | Not verified in browser |
| Screen reader landmarks | main, header, sections, evidence aside | Source implemented; browser check pending |

## Honest release gate

This document is not proof of a world-class shipped experience yet. S228 becomes review-ready only after the authenticated 390px and 1440px screenshots, keyboard pass, zero console/page errors, and CI validation are attached to the pull request. Device-specific GIII instructions remain outside this PR and remain unverified until real-device validation.
