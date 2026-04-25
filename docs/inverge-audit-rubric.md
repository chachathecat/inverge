# Inverge Audit Rubric

본 문서는 화면/플로우/데이터정책이 Inverge 운영 원칙을 준수하는지 점검하는 감사 기준이다.

## 1) 16-Question Surface Audit
각 화면/플로우마다 아래 16개 질문을 모두 기록한다.

1. 단일 Primary Action이 무엇인가?
2. 어떤 evidence-based learning behavior를 만드는가?
3. 어떤 good default를 설정했는가?
4. 사용자는 어떻게 override 가능한가?
5. 어떤 cognitive load를 제거했는가?
6. 어떤 피드백을 제공하는가?
7. 즉시 다음 행동은 무엇인가?
8. 어떤 데이터를 캡처하는가?
9. 작동 여부를 보여줄 핵심 metric은 무엇인가?
10. calm Korean operational copy를 사용하는가?
11. generic AI SaaS 패턴을 피했는가?
12. 감정평가사 1차/2차 고정 범위를 지키는가?
13. (Instructor scope 해당 시) **강사 검수** 없는 최종 확정을 차단하는가?
14. data reuse consent flag를 저장/집행하는가?
15. academy tenant separation을 보장하는가?
16. AI 최종판정/무검수/자동합격 문구를 배제하는가?

## 2) Severity Definitions

### P0 (즉시 조치)
- security/access failures
- auth/session breakage
- data loss or entitlement overwrite
- unsupported exam scope 노출
- production crash route
- instructor tool의 learner 노출
- 강사 검수 없는 확정 채점 허용
- 테넌트 간 데이터 혼합/누출
- 무권한 raw submission 재학습

### P1 (단기 수정)
- one-screen-one-task 위반
- 실행흐름 dashboard clutter
- 피드백 후 retry/rewrite 부재
- passive-review-first
- review scheduling 누락
- next action 없는 AI feedback
- core screen의 generic AI SaaS 표현
- 혼란스러운 한국어 카피
- consent/reuse flag는 있으나 집행 로직 미흡

### P2 (개선)
- visual refinement
- animation polish
- secondary analytics 개선
- empty-state 정교화
- 카피 미세조정

## 3) Audit Process
1. Surface inventory 작성 (learner vs instructor 분리)
2. 각 surface에 16문항 채점
3. P0/P1/P2 분류
4. 수정 후 재감사
5. 릴리즈 전 P0=0 확인

## 4) Required Evidence per Surface
- screenshot or recording link
- primary action 표시
- default + override 표시
- captured data event 목록
- metric mapping
- next action 경로
- role/permission matrix 근거
- consent/reuse flag 상태 근거
- tenant boundary test 증적
- instructor 승인 이력(해당 시)

## 5) Metrics Mapping Minimum Set
- time_to_first_action
- task_start_rate
- task_completion_rate
- retry_conversion_rate
- rewrite_conversion_rate
- delayed_retry_accuracy
- repeated_error_rate
- review_completion_rate
- recovery_task_completion_rate
- one_gap_rewrite_completion_rate
- reduction_in_same_gap_recurrence
- instructor_draft_to_approval_rate
- approval_turnaround_time
- tenant_isolation_incident_count

## 6) Anti-Patterns Checklist
- 점수만 보여주고 종료
- 선택지 과다(>3 primary choices)
- 과장형 AI 문구
- 불안 유도 UX
- 범위 외 시험 노출
- 결제 유도 우선 플로우
- AI가 최종 채점 문구
- 무검수 채점 플로우
- 자동 합격 판정 카피
- raw 답안 무단 학습 파이프라인

## 7) Audit Output Template
```md
### [Surface Name]
- Surface Type: Learner / Instructor
- Primary Action:
- Behavior Target:
- Default / Override:
- Captured Data:
- Consent/Reuse Flag:
- Tenant Boundary Check:
- Human Approval Gate (if instructor):
- Metric:
- Findings: P0 / P1 / P2
- Next Fix:
```
