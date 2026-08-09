---
decision_title: "답안길 V13.1 단일 active master 및 감점 제거 증명 Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-10 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-1-2026-08-10.md"
machine_contract: "config/dabangil-indispensable-product-gap-elimination-v1.json"
validation_record: "docs/qa/master-plan-v13-1-indispensable-product-validation.md"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, environment, deployment or Production"
  - "real learner, real content, Owner Alpha, first-stage, other-exam or external account activation"
  - "pricing, checkout, payment, refund, entitlement or commercial cohort"
  - "Ready transition, merge, auto-merge or follow-on implementation"
---

# Owner 결정 — V13.1 단일 active master

## 1. 결정

V13.1을 V13의 대체 폐기판이 아니라, V13 전체를 mandatory technical baseline으로
상속한 **단일 active strategy entry point**로 채택한다.

```text
V13.1 single active strategy
├─ V13 mandatory technical baseline
├─ MCAL mandatory follow-up
└─ Indispensable Product & Verified Gap Elimination Layer
```

V13은 삭제하지 않는다. V13의 VESG, coverage, Exam World Twin, capability,
curriculum, assessment proof, scoring/audit와 internal Portable Core는 계속
필수다.

## 2. 제품 우선순위 결정

앞으로 최상위 제품 질문은 “기술을 몇 개 더 만들 것인가”가 아니다.

> 사용자의 반복 감점 원인을 정확한 답안 위치에서 찾아내고, 교정한 뒤,
> 다음 미사용 문제에서 실제로 제거됐음을 증명했는가?

제품 critical path:

```text
Trust/source safety
→ exact answer anchor
→ one biggest deduction cause
→ direct repair
→ D+1 independent reconstruction
→ D+7 verified transfer
→ timed recurrence
→ Personal Recurring Deduction DNA
→ Today / Full-Day replanning
→ external paid use and voluntary repurchase
```

Broad EDT, Portable Core, generic dashboard, multi-exam abstraction 또는 MCAL surface는
이 vertical을 무기한 늦추지 못한다.

## 3. successful-performance gate

Canonical evaluation의 존재·완료·provenance만으로 positive learning evidence를
부여하지 않는다.

Base, transfer와 D+7 각각은 exact canonical `SuccessfulPerformanceOutcomeV1`을
독립적으로 resolve해야 한다.

필수:

- exact attempt/learner/task/evaluation binding
- `outcomeState = accepted_success`
- `acceptedByPolicy = true`
- subject validator pass
- required deterministic/rubric/source checks pass
- unresolved conflict 0
- assistance/exposure/replay eligibility pass

incorrect, zero, blank, below-threshold, unresolved, conflict 또는 stale result는
`independentRetrieval`, `farTransfer`, `stableD7` 또는 closure를 만들지 못한다.

## 4. verified closure

Same-session repair는 elimination이 아니다.

```text
detected
→ repair_verified_same_session
→ d1_reproduced
→ d7_transfer_confirmed
→ timed_recurrence_clear
```

Learner-facing “제거됨”은 policy-required D+7 verified transfer와 timed
recurrence가 모두 successful outcome일 때만 허용한다. 이후 qualifying failure는
`recurred`로 reopen한다.

## 5. Personal Deduction DNA

반복 감점 DNA는 learner-private, bodyless, recomputable derived projection이다.
두 번째 mastery, 성격·지능 판정, pass probability 또는 shared training corpus가
아니다.

## 6. 일일 관제

- Today `CoreOutcome`: 0..3
- Full-Day `ExecutionBlock`: available minutes 안에서 0..N
- Review Queue: minute-budgeted
- task/block completion alone changes no mastery or closure
- plan priority는 engagement metric이 아니라 current evidence에서 나온다

## 7. 상업 증거

결제만으로 제품가치가 증명되지 않는다.

```text
exact approved payment
+ usable review >= 2
+ direct repair
+ D+1 independent successful outcome
+ voluntary next-pack purchase
```

Owner dogfood는 external usability, price, renewal, efficacy 또는 market을
증명하지 않는다.

## 8. 현재 merge 경계

이 결정 세트는 PR #694 branch 위에 쌓인다. PR #694에 남은
successful-performance P1이 exact contract/test에서 해결되고 PR #694가 병합된
뒤에만 V13.1 PR을 main으로 retarget할 수 있다.

V13.1 문서가 같은 invariant를 선언하는 것은 PR #694 defect를 자동 해결하지
않는다.

## 9. 명시적 비승인

이 결정은 source strategy만 다룬다. runtime, schema, data, model, provider,
dependency, UI, roadmap active state, payment 또는 Production을 승인하지 않는다.
