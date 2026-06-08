# Closed Beta Learning Metrics QA Note

This QA note mirrors `docs/closed-beta-learning-metrics.md` for staging sign-off reviewers.

PR #345 reduces mobile capture friction while keeping metrics metadata-only and disabled by default.

- Text-first capture is the primary closed-beta path.
- OCR/PDF remains draft/fallback.
- Low-confidence OCR requires confirmation before practice.
- Capture metrics may include `capture_started`, `capture_saved`, `adaptive_today_plan_generated`, `curriculum_node_matched`, and `learning_state_transitioned` only as metadata-only events.
- No raw OCR/problem/answer/source/copyright/official/model/score/instructor fields may be included.
- No external analytics/network calls are introduced by the metrics sink.
