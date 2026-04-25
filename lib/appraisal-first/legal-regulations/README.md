# Legal Regulations Sample Subject Wiring

This folder wires the second subject sample scope, `appraisal_law`, into the same Inverge diagnosis loop that civil law uses.

## Reused contract from civil law

- `SetSubmissionInput` remains the entry point.
- `ReviewQueueCandidate`, `DiagnosisEvent`, `WeeklyCoachingPlan`, records, and dashboard summaries are shared.
- `AppraisalFirstService.saveSetSubmission` selects a subject engine, saves review candidates with the submission, then persists final diagnosis events and weekly coaching seed.
- Mock repository aggregation is subject-agnostic, so review queue, records, and dashboard summaries work without a new UI route.

## Subject-specific data

- `curriculum.ts` maps sample questions `law-1` to `law-5` to curriculum nodes.
- `root-cause-tags.ts` defines legal-regulation-specific tags such as article recall, deadline recall, authority confusion, procedure order, scope limit, and similar statute confusion.
- `diagnosis-engine.ts` converts solving results into diagnosis events, review candidates, and a weekly coaching seed.

## Difference from civil law

- Civil law focuses on concept comparison, exception clauses, agency/declaration/invalidity confusion, and case-fact mapping.
- Legal regulations focuses on statute recall, procedure order, deadline requirements, authority subject, scope limits, and similar statute traps.
- Legal regulations adds mapping fields for `articleRefs`, `testedRuleType`, `choiceTrapType`, `legalStructureType`, and statute/procedure flags.
- Weekly coaching for this subject prioritizes `law_memory` and `option_judgment` unless the dominant issue is time pressure.

## Current sample boundary

- This is not a full legal-regulations curriculum.
- It is intentionally limited to five existing sample set questions so the cross-subject pipeline can be verified before expanding breadth.
- Article references are placeholders and should be replaced by operator-reviewed statute citations before production use.
