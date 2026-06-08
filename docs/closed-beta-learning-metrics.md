# Closed Beta Learning Metrics v1

This document defines Inverge's closed-beta, metadata-only learning metrics layer for the learner-facing 감정평가사 1차 / 감정평가사 2차 product scope.

## Purpose

Closed beta metrics answer whether the learner OS improves:

- capture completion
- note-to-plan conversion
- curriculum node matching
- learning state transitions
- explanation quality
- Today Plan task completion
- review completion
- weak concept recovery
- D1/D7 retention proxies

These metrics are operational diagnostics only. They are not official grading, score prediction, pass/fail judgment, official model answers, or 합격 보장.

## Data boundary

Events are always `metadataOnly: true`. The default sink is disabled unless `LEARNING_METRICS_ENABLED=1` is set, and the repository implementation makes no external analytics calls.

Allowed metadata fields are limited to event name, timestamp, safe user-scoped identifiers if an existing safe convention is available, exam mode, subject, concept node id, task type, source event type, and an allowlisted `properties` object.

Forbidden data includes raw OCR text, raw answer text, problem/question/source/copyrighted text, official/model answers, score or score prediction, instructor comments, payment metadata, and token/secret/session values.

## Event catalog

- `capture_started`
- `capture_saved`
- `curriculum_node_matched`
- `explanation_quality_evaluated`
- `learning_state_transitioned`
- `adaptive_today_plan_generated`
- `today_plan_task_started`
- `today_plan_task_completed`
- `review_queue_task_completed`
- `confident_wrong_detected`
- `confident_wrong_recovered`
- `weekly_recovered_weak_concepts_computed`

## Closed-beta summary

The summary script reads only a local JSON fixture or its built-in fixture. It verifies metadata-only events, forbidden-field removal, weak concept recovery computation, D1/D7 retention proxy support, and disabled-by-default metrics.

```bash
npm run check:closed-beta-learning-metrics
```

Expected output:

```json
{
  "status": "passed_closed_beta_learning_metrics",
  "verified": [
    "metadata_only_events",
    "forbidden_fields_removed",
    "weekly_recovered_weak_concepts_computed",
    "retention_proxy_supported",
    "metrics_disabled_by_default"
  ]
}
```

## Rollout guardrails

- Do not enable durable production rollout by default.
- Do not add public archive UI, payment, push notifications, native app behavior, or new exams.
- Do not use metrics to make learner-facing final judgments.
- Keep the metric sink no-op unless explicitly enabled for closed beta test/dev operation.
