# 답안길 한국어 학습자 언어 v1

내부 ID와 증거 의미는 바꾸지 않고 화면 표현만 학습자 언어로 번역한다.

| 내부 개념 | 학습자 표현 |
|---|---|
| Today | 오늘 |
| primary task | 오늘의 한 가지 |
| Today Plan | 오늘 할 일 |
| Full-Day | 오늘 전체 공부표 |
| Review Queue | 복습 대기 |
| Personal Study Ledger | 내 공부 기록 |
| biggest gap | 가장 큰 감점 원인 |
| repair | 지금 고치기 |
| D+1 | 다음 날 혼자 해보기 |
| D+7 | 일주일 뒤 다른 문제 |
| timed recurrence | 제한시간 실전 확인 |
| recovering | 고치는 중 |
| stable/currently clear | 현재 안정 |
| reopened | 다시 확인 필요 |
| insufficient evidence | 아직 기록이 부족해요 |

첫 화면에는 `D+1`, `D+7`, `Today Plan`, `Full-Day`, `timed recurrence`,
`CURRENTLY_CLEAR`, `REOPENED`, `NORMAL`, `MINIMUM_MAINTENANCE`, record
version, anchor ID, source-version ID, taxonomy ID를 노출하지 않는다. Owner용
기술 상세에는 조용히 표시할 수 있다.

`완전 정복`, `마스터`, `합격 확정`처럼 증거보다 강한 표현을 쓰지 않는다.
상태가 부족하면 `아직 기록이 부족해요`, 다시 실패하면 `다시 확인 필요`로
표현한다. 한 화면의 주 행동은 하나이며 무엇·이유·시간·다음을 모두 읽을 수
있어야 한다.
