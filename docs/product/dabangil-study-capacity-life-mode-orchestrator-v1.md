---
document_title: "답안길 Study Capacity & Life-Mode Orchestrator v1"
status: "source-implemented/default-off"
dated: "2026-08-24 KST"
repository: "chachathecat/inverge"
production_authorization: "none"
relation_to_master_plan: "V13과 Full-Day/CoreOutcome 계약 아래의 독립 subordinate source implementation"
---

# 답안길 Study Capacity & Life-Mode Orchestrator v1

## 0. 제품 결정

답안길은 전업 수험생의 8~10시간급 Full-Day와 직장병행 수험생의 평일 1~3시간을 동일한 계획의 확대·축소판으로 취급하지 않는다.

계획은 다음 네 축을 독립적으로 결합한다.

```text
생활 형태
× 당일 실제 가용 순공시간
× 시험 모드(1차/2차/동차)
× 시험 단계(기초/범위/압축/실전/막판/회복)
```

생활형태가 곧 능력은 아니다. 전업도 회복일에는 compressed mode가 될 수 있고, 직장병행도 주말에는 intensive mode 또는 full-day mode가 될 수 있다.

`10시간`은 공식 합격조건도, 모든 사용자의 기본값도 아니다. Q-Net의 공식 시험구조는 과목·문항·시험시간·합격기준을 정하지만 일일 학습시간을 합격요건으로 정하지 않는다. 답안길은 600·720분을 **Full-Day 운영 fixture**로만 사용한다.

## 1. 유지되는 기존 계약

```text
CoreOutcome 0~3개 (hard limit)
ExecutionBlock 0..N within capacity
LearningDocument = 개인 학습 계보
ReviewUnit = D+1/D+7/timed 회복 단위
```

- 핵심 성과는 최대 3개지만 한 성과는 여러 실행 블록을 묶을 수 있다.
- 계획된 active 분은 evidence-supported capacity를 초과할 수 없다.
- block 완료는 운영 증거일 뿐 mastery가 아니다.
- AI 도움 후 성공은 independent success가 아니다.
- 같은 문제 재정답은 unseen transfer가 아니다.
- 밀린 과제를 다음 날로 복제해 backlog를 폭발시키지 않는다.

## 2. `StudyRegimeV1`

```ts
type LifeModeV1 =
  | "full_time_study"
  | "full_time_employed"
  | "part_time_employed"
  | "shift_or_irregular_work"
  | "leave_or_transition"
  | "caregiving_constrained"
  | "health_constrained"
  | "custom";

type ExamModeV1 = "first" | "second" | "both";

type StudyPhaseV1 =
  | "foundation"
  | "coverage"
  | "consolidation"
  | "timed_integration"
  | "final_sprint"
  | "recovery";
```

불변식:

- `lifeMode`는 노력·실력·가격·진지함 평가에 사용하지 않는다.
- capacity band는 매일 바뀔 수 있다.
- 선택적 피로·일정정보는 learner-private이며 의학적 진단에 사용하지 않는다.
- 회사명·직업·소득은 필요하지 않다.

## 3. 시간의 분리

```text
availableWindowMinutes
= 식사·휴식까지 포함한 사용 가능한 전체 시간창

targetActiveStudyMinutes
= 강의·읽기·문풀·답안·복습의 순공 목표

actualActiveMinutes
= 앱 조작·provider 대기·idle·식사·휴식을 제외한 evidence
```

타이머를 켠 시간이나 앱 체류시간을 순공으로 승격하지 않는다.

## 4. Capacity Envelope

지원 범위:

```text
micro       30~90
compressed  91~180
standard    181~360
intensive   361~599
full_day    600~720
```

Day 1에는 선언 capacity를 사용하되 `declared_only`로 표시한다. 7일 이후에는 실제 active evidence로 보정하고, 14일 이후에는 `evidence_supported_14d`로 표시할 수 있다.

보정에서 제외:

```text
app interaction
provider wait
background idle
long absence
meal/break
failed generation
```

최근 피로 자가표시 또는 후반 오류가 반복되면 다음 계획의 capacity를 보수적으로 낮출 수 있다. 이는 진단이나 의지 평가가 아니다.

## 5. 인지부하 예산

모든 Full-Day를 고강도 문제풀이로 채우지 않는다.

| Load | 예시 |
|---|---|
| high | 미사용 timed set, 전체 답안, 새로운 고난도 계산, far transfer |
| medium | 오답교정, D+7, 문단 다시쓰기, 그래프·식 전환 |
| low | 강의, 기본서, 정리, 안정단원 확인 |
| recovery | 캡처 정리, 다음 행동 확인, 저부하 회상 |

600~720분 계획은 high-load budget이 전체 schedulable capacity보다 반드시 작고, medium·low·recovery와 unallocated buffer를 보존한다.

## 6. 생활형태별 정책

### 6.1 전업 수험

- 480~720분 Full-Day를 허용한다.
- CoreOutcome은 최대 3개, ExecutionBlock은 6~14개까지 가능하다.
- 긴 독립수행을 interruption이 낮은 시간창에 배치한다.
- 하루 후반에는 고강도 연속 배치를 줄이고 검토·교정·정리로 전환한다.
- 10시간을 채우는 것이 아니라 10시간 안에서 독립 전이와 실전 evidence를 최대화한다.

### 6.2 풀타임 직장병행

- 평일 CoreOutcome은 보통 1~2개다.
- 평일 우선순위는 due review, 과락위험, 확신오답, 짧은 독립수행이다.
- 100~120분 이상의 timed task는 연속시간창이 없으면 주말로 이동한다.
- 주말에는 420~600분 intensive/full-day를 사용할 수 있다.
- 직장병행 2시간을 low-commitment나 casual로 분류하지 않는다.

### 6.3 교대·불규칙 근무

- 고정 요일표보다 실제 rolling window를 사용한다.
- commute에서는 음성·짧은 회상만 허용하고 답안·계산·timed work는 차단한다.
- 보호된 수면·근무 시간창을 침범하지 않는다.
- 변동성이 높으면 CoreOutcome을 최대 2개로 줄인다.

### 6.4 회복

- CoreOutcome은 0~1개다.
- 새 학습을 자동 누적하지 않는다.
- optional scope는 drop할 수 있다.
- keep/defer/drop을 명시하고 backlog clone은 0이다.

## 7. 시험모드 정책

### 1차

전업형은 40문항 과목세트, 120/80분 실전형, 선지교정, 계산검증, D+1/D+7을 하루 여러 블록으로 운영한다. 직장병행 평일은 due review와 가장 위험한 과목 1개를 보호하고, 긴 timed 세트는 주말로 이동한다.

### 2차

전업형은 실무·이론·법규의 독립 답안, exact gap repair, D+1/D+7, timed recurrence를 Full-Day에 배치한다. 직장병행형은 평일에 문단·산식·목차 최소단위를 복구하고 주말에 전체 답안을 쓴다.

### 동차

1차와 2차를 매일 모두 조금씩 강제하지 않는다. 시험까지 거리와 evidence에 따라 비중을 바꾸되 2차 output continuity floor 또는 1차 과락위험 보호선을 명시한다.

## 8. 계획 완주 가능성은 합격확률과 분리 — Plan Gap

`PlanGapV1`은 일정상 부족을 정직하게 보여준다.

```text
forecast capacity
required plan minutes
shortfall
reason codes
choices
```

선택지는 low-value scope 제거, support 축소, 주말 이동, capacity 증가, 비핵심 연기, 목표시점 변경이다.

`Plan Gap`은 합격확률이 아니다. 다음 문구는 금지한다.

```text
이대로면 반드시 불합격
하루 10시간 미만이면 합격 불가
의지가 부족함
```

## 9. AI 문제 생성과 공부시간 분리

```text
공부시간 != AI 생성 entitlement
```

개인 microdrill은 다음 48시간 실제 drill capacity를 넘겨 만들지 않는다.

```text
verified bank 검색
→ 있으면 먼저 배정
→ 없고 capacity가 남을 때만 personal generation
```

개인 생성문제는 기본적으로:

```text
readinessEligible = false
crossUserReuseEligible = false
```

이다. 전업 사용자가 10시간 공부한다고 고비용 AI를 무제한 호출하게 하지 않는다.

## 10. 사용자 화면 계약

### Onboarding 최소 입력

```text
시험 모드
목표 시험일
현재 생활형태
평일/주말 가능시간
주로 가능한 시간창
고정 일정
```

### Today

```text
오늘 가능 순공
오늘 모드
오늘의 핵심 0~3
전체 공부표 0..N
주말로 이동한 긴 과제
buffer와 Plan Gap
```

### 즉시 재계획

야근·질병·가족일정·에너지저하가 생기면 기존 과제를 무한 복제하지 않는다.

```text
keep
shorten(향후 integration에서 지원)
defer
drop
```

현재 순수 정책엔진은 keep/defer/drop과 backlog clone 0을 보장한다.

## 11. 성공지표

시간 자체보다 다음을 본다.

- 계획 대비 실제 active minutes;
- independent attempt/retrieval/timed minutes;
- D+1·D+7 성공과 재발;
- 고확신 오답 감소;
- 후반 오류 증가 여부;
- 계획 재편 횟수와 backlog 회복;
- 같은 evidence 기준에 도달하는 누적 순공시간.

금지 vanity metric:

```text
앱 체류시간
10시간 streak
생성 문제 수
대화 횟수
계획 100% 강박
```

## 12. Source implementation

이 PR은 다음 7개 경로만 추가한다.

```text
docs/decisions/2026-08-24-owner-study-capacity-life-mode-orchestrator.md
docs/product/dabangil-study-capacity-life-mode-orchestrator-v1.md
config/dabangil-study-capacity-life-mode-orchestrator-v1.json
docs/qa/dabangil-study-capacity-life-mode-orchestrator-validation.md
lib/review-os/study-capacity-life-mode-orchestrator.ts
tests/study-capacity-life-mode-orchestrator.test.mjs
tests/dabangil-study-capacity-life-mode-contract.test.mjs
```

구현된 것:

- type contracts;
- capacity classification and calibration;
- cognitive-load budgets;
- deterministic daily/weekly allocation;
- full-time/employed/shift/recovery policies;
- Plan Gap;
- replan without backlog cloning;
- 48-hour drill budget;
- deterministic digest and fail-closed validation;
- focused regression and source-consistency tests.

구현되지 않았고 이 PR이 승인하지 않는 것:

- onboarding·Today·Full-Day UI;
- learner profile/plan persistence;
- RLS, migration, Supabase, Storage;
- calendar, push, mobile, instructor;
- public first-round runtime, billing, Production;
- PR #800 or C3R-P/T/L mutation.

따라서 이것은 아이디어 문서가 아니라 **테스트 가능한 기본 정책엔진**이지만 learner-facing runtime 완성을 주장하지 않는다.

## 13. 후속 통합 gate

현재 merge-producing writer가 terminal한 뒤 별도 Work에서만 다음을 수행한다.

1. live authority와 path 재조정;
2. optional life-mode onboarding과 동의;
3. learner-private persistence/RLS;
4. existing Today/Full-Day candidate adapters 연결;
5. 390/768/1440, 200% reflow, keyboard/screen-reader;
6. refresh/second browser/account A-B/offline/conflict/session expiry;
7. 7/14일 실제 calibration Owner-private dogfood;
8. rollback과 kill switch.

이 PR은 `AGENTS.md`, unified contracts, roadmap selector 또는 PR #800을 수정하지 않는다.

## 14. 최종 원칙

> **2시간 계획은 10시간 계획의 축소판이 아니고, 10시간 계획은 2시간 계획의 문제 수 증가판이 아니다.**

전업형은 많은 시간을 시험능력으로 바꾸는 운영이 필요하다. 직장병행형은 적은 시간에서 가장 중요한 독립수행을 놓치지 않는 운영이 필요하다.

답안길은 공부시간을 평가하지 않는다. 사용자의 현실적 시간 안에서 오개념 복구, 미사용 독립수행, 반복오류 감소를 최대화하고 계획이 불가능하면 무엇을 버릴지 정직하게 알려준다.
