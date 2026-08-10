---
document_title: "Owner Decision — 감정평가사 2차 World-Class Vertical Execution Standard v1"
status: "owner-decision/proposed-source-only"
contract_version: "1.0.2"
dated: "2026-08-10 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
active_pointer_mutation: "none"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
commercial_activation_authorization: "none"
production_authorization: "none"
---

# Owner Decision — 감정평가사 2차 World-Class Vertical Execution Standard v1

## 1. 결정

V13은 계속 답안길의 유일한 active master plan이다.

새 V14나 V13.1 active master를 만들지 않는다. 대신 V13이 이미 정의한
Trust, reasoning, transfer, Full-Day, privacy, source/rights/version 원칙을
실제 감정평가사 2차 제품으로 번역하는 subordinate execution standard를
채택한다.

정식 이름:

> **Appraiser Second World-Class Vertical Execution Standard v1**

제품 약속:

> **내 답안의 가장 큰 감점 원인을 정확한 위치에서 찾아, 직접 고치게 하고,
> 다음 날·다른 문제·제한시간 전체 답안에서 다시 틀리지 않는지 확인한 뒤,
> 그 증거로 오늘의 공부를 다시 정한다.**

## 2. 이 결정이 승인하는 것

이번 source-only Work가 승인하는 것은 다음 여섯 artifact와 기존 test runner의
정확한 등록 변경뿐이다.

1. Owner decision
2. world-class vertical execution strategy
3. benchmark and adoption matrix
4. machine-readable mirror
5. source validation record
6. focused regression test
7. `scripts/run-node-tests.mjs`의 focused test 등록

이 결정은 구현·활성화를 승인하지 않는다.

## 3. 세계급 설계의 판정 방식

세계급은 기능 수나 AI 대화량으로 판정하지 않는다.

```text
정확한 answer anchor
→ successful-outcome-qualified biggest gap
→ direct repair
→ D+1 independent reconstruction
→ D+7 verified non-same-surface transfer
→ timed recurrence
→ learner-private recurring deduction projection
→ evidence-driven Today / Full-Day
```

위 계보가 실무·이론·법규에서 각각 완전히 작동하고, 외부 사용자가 실제로
사용·재구매할 때에만 세계급 후보로 판정한다.

## 4. 제품·오픈소스 패턴 채택 원칙

세계급 제품과 오픈소스에서 기능을 복제하지 않고 메커니즘을 추출한다.

- UWorld: 시험형 수행, Tutor/Timed 분리, 성과에서 다음 테스트로 이동
- AMBOSS: 개인 수행·시험 중요도·진도를 다음 행동에 연결
- Duolingo Birdbrain: learner 상태와 task difficulty의 결합, A/B 검증
- Khanmigo: 측정 화면에서 AI 도움 차단
- OATutor: step-level skill mapping, bounded hints/scaffolds, policy 비교
- FSRS: review due 시점 후보만 제공
- H5P Branching Scenario: near-miss·반례·조건 뒤집기 authoring pattern
- QTI/Caliper/PROV/NIST: assessment interchange, bodyless event vocabulary,
  provenance, AI risk and TEVV 참조

어떤 외부 제품이나 dependency도 답안길의 answer, mastery, biggest gap,
learning priority 또는 release authority가 될 수 없다.

## 5. 실행 순서

```text
0. PR #698 terminal merge 확인
1. 본 source-only execution standard
2. PR #697 active-master 승격안 supersede/close
3. O3A 만료 및 S236P blocked 상태 read-only reconciliation
4. live activation은 S236P completed exact acceptance 전까지 금지
5. synthetic/local build lane과 live activation lane 분리 결정
6. Golden 3 완전 수직루프
7. Capture + exact anchor
8. Diagnose + repair verification
9. D+1 + D+7 + timed recurrence
10. Personal Study Ledger
11. Recurring Deduction Projection
12. Today / Full-Day
13. Owner dogfood
14. S241A → O3C → S239A / Golden 9 external readiness
15. S242C → O4F / external trust + exact external-commercial O4 entry gate
16. exact authorization to enter S243C
17. S243C / external 3~5 paid Wave A
18. S243C completion 뒤 post-canary 10~15명 staged expansion
19. 20~30명 + voluntary repurchase
```

## 6. 불변식

- exact answer anchor가 없으면 usable biggest gap이 아니다.
- evaluation completion은 successful learning evidence가 아니다.
- AI 풀이 열람은 independent performance가 아니다.
- same-item 또는 same-surface 성공은 transfer가 아니다.
- verified non-same-surface variant가 없으면 D+7 transfer가 아니다.
- timed recurrence evidence가 없으면 gap closure가 아니다.
- 후속 독립 실패는 closure를 reopen한다.
- 실무 deterministic conflict는 숫자 release를 막는다.
- 법규 source/effective-version conflict는 verified conclusion을 막는다.
- block completion은 mastery를 바꾸지 않는다.
- Today CoreOutcome은 0..3이다.
- Full-Day available minutes는 trusted-server integer 30..720이고
  ExecutionBlock은 그 범위 안에서 0..N이다.
- engagement, streak, time-in-app는 learning priority를 결정하지 않는다.
- raw learner body는 shared analytics, graph label, cross-user cache에 들어가지 않는다.
- private raw learner content는 model training input으로 절대 사용하지 않는다.
- exact-purpose consent만으로 raw learner-content training을 허용할 수 없다.
- future training 후보는 consented pseudonymous non-reconstructive signal 또는
  promoted Cleared Content Bank material뿐이다.
- S236P blocked, failed 또는 terminal disposition은 completed exact acceptance가 아니다.
- Owner-private acceptance, generic Owner activation, dogfood 또는 Early Value는
  exact external-commercial O4 packet과 canonical commercial path를 대체하지 않는다.

## 7. PR #697 disposition

PR #697의 product-value 아이디어는 이 표준에 흡수한다.

그러나 다음은 채택하지 않는다.

- V13.1 active-master 승격
- `ACTIVE-MASTER-PLAN.md` 교체
- stale stacked-base 유지
- 새 전략 버전이 구현증거를 대신하는 구조

본 표준이 검토·병합되면 PR #697과 Issue #695는 superseded/not-planned로
정리하는 것이 권고된다.

## 8. 금지

- runtime, UI, API, schema, migration, RLS, Storage, provider mutation
- real learner/content processing
- Owner Preview/Production activation
- first-stage 또는 다른 전문직 learner surface
- price, payment, entitlement, checkout
- learner-facing pass probability, confirmed score, official grading
- 자유형 AI chat를 제품 중심으로 전환
- streak, leaderboard, casino-style gamification
- 전체 20년 문제은행을 초기 critical path에 배치
- FSRS/BKT/OR-Tools를 canonical authority로 사용
- S236P completed acceptance 없이 live activation
- exact external-commercial O4 packet과 canonical commercial path 없이 paid canary
- S243C completion을 S243C paid Wave A 진입 선행조건으로 사용
