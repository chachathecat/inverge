---
decision_title: "답안길 Versioned Exam Scope & Evidence Graph 공통 인프라 및 첫 구축순서 Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
mandatory_annex: "docs/strategy/dabangil-versioned-exam-scope-evidence-graph-v1-2026-08-06.md"
machine_contract: "config/dabangil-versioned-exam-scope-evidence-graph-v1.json"
amends:
  - "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md section 32 execution order"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment or Production changes"
  - "actual historical-question ingestion"
  - "First-stage learner-facing activation"
  - "real third-party source processing"
  - "Ready transition, merge or auto-merge"
---

# Owner 결정 — Versioned Exam Scope & Evidence Graph

## 1. 결정

V12 Official Coverage Compiler의 공통 범위·근거 계층을 다음 이름으로 고정한다.

```text
Versioned Exam Scope & Evidence Graph
short name: VESG
```

VESG는 별도 제품이나 V12 대체안이 아니다. 다음 네 층이 같은 canonical
범위와 version을 읽게 하는 필수 인프라다.

```text
Official Coverage Compiler
Original Concept Curriculum
Synthetic Question Engine
Private Ephemeral Book Tutor bridge
```

## 2. 첨부자료 반영

Owner가 제공한 과거 공식 출제영역은 historical official root로 사용한다.
제2차 실무의 기초·물건별·목적별·응용, 이론의 원리·방식·응용, 법규 세
법률과 제1차 과목별 주요·세부항목을 모두 source lineage와 함께 보존한다.

과거 문서의 오래된 법률명은 현재 법률명으로 조용히 덮어쓰지 않는다.

```text
historical official source
→ explicit version crosswalk
→ target-exam current official node
```

## 3. 범위와 우선순위 분리

다음을 독립 상태로 보존한다.

1. official scope
2. target-date norm
3. observed exam
4. official-unobserved and one-hop adjacent
5. learning priority

`기출 없음`, `우선순위 낮음`, `현행 범위 밖`은 서로 다른 상태다.

## 4. 기출 분석단위

제2차:

```text
question → subquestion → points → command/judgment/procedure step
```

제1차:

```text
question → option → independent proposition → exact error point
```

과거 기출에는 `answer_as_examined`와 `answer_as_of_target_date`를 함께
보존한다.

## 5. 첫 구축순서

다음 순서는 기존 Coverage Compiler 문서의 ACC-3/ACC-4/ACC-5 순서를 exact
decision 범위에서 수정한다.

```text
1. 감정평가실무 2013-2026
2. 감정평가이론·감정평가 및 보상법규 2013-2026
3. 제1차 2016-2026, 선택지 명제 단위
4. current norm closure와 historical/current crosswalk
5. official-unobserved, one-hop, priority와 walk-forward backtest
6. read adapters와 Owner-private evaluation
```

제1차 concept seed를 작성할 수는 있으나, 위 세 corpus build보다 먼저
release taxonomy 또는 learner-facing runtime으로 승격하지 않는다.

## 6. V12와의 관계

- V12는 single active strategy entry point로 유지한다.
- 기존 Coverage Compiler와 Original Question Engine 명세는 유지한다.
- VESG annex가 canonical graph, historical-question unit, version,
  priority/backtest와 첫 build order를 구체화한다.
- 충돌 시 이 dated Owner decision과 VESG machine contract가 exact VESG
  decision 범위에서 우선한다.
- V11의 더 엄격한 source-safety 계약은 그대로 유지한다.

## 7. 비승인 경계

이 결정은 문서·제안 기계계약의 PR 반영만 허용한다. 실제 기출 수집, DB,
API, runtime, 제1차 활성화, 생성문제 제공, real source processing 또는
Production은 별도 exact-scope Work가 필요하다.
