---
decision_title: "답안길 Memory Cue & Annotation Layer V13 후속 Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
mandatory_annex: "docs/strategy/dabangil-memory-cue-and-annotation-layer-v1-2026-08-06.md"
machine_contract: "config/dabangil-memory-cue-and-annotation-layer-v1.json"
validation_record: "docs/qa/memory-cue-and-annotation-layer-v1-validation.md"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment or Production"
  - "terminology corpus build, Hanja dictionary import, real source processing or personal annotation persistence"
  - "MCAL-1 terminology construction, MCAL-2 Memory Post-it runtime, MCAL-3 semantic-highlight runtime or MCAL-4 personal-annotation runtime"
  - "roadmap/WIP mutation, CPF-2A implementation, PR #692 mutation, Ready transition, merge or auto-merge"
---

# Owner 결정 — Memory Cue & Annotation Layer

## 1. 결정

V13의 필수 후속 부속계약으로 `Memory Cue & Annotation Layer(MCAL)`를 채택한다.
V13은 계속 유일한 active master plan이며 MCAL은 V14가 아니다.
MCAL은 별도의 정의 저장소나 두 번째 정의 authority가 아니다. 모든 `exactDefinitionRef`는
released·versioned VESG concept/evidence projection을 가리키며, 해석 실패·hold·drift 시 cue도 release하지 않는다.

MCAL의 역할은 다음 연결점을 고정하는 것이다.

```text
검증된 exact definition·concept·QuestionUnit
→ 검증된 한자/형태소/어근 해부
→ 암기용 쉬운 풀이와 대비
→ 단서 제거형 회상
→ attempt/repair/transfer/D+1/D+7 evidence
```

## 2. 정확한 개발 우선순위

```text
핵심 근거·개념·문제·검증 엔진
→ attempt/repair/transfer/D+7 루프
→ 용어 해부·기억 포스트잇 MVP
→ 의미형 하이라이트
→ 개인 주석 편집기
```

이 순서를 문서와 기계계약에 고정한다. 이번 결정은 MCAL-0 source-only 계약만 허용한다.

## 3. 정의와 암기말 분리

```text
formalTerm ≠ literalGloss ≠ memoryGloss ≠ exactDefinitionRef ≠ independent evidence
```

암기말·비유·한자 직역은 공식 정의, 공식답안, 채점기준 또는 mastery가 아니다.
`exactDefinitionRef`는 released·versioned VESG concept/evidence projection으로만 resolve한다.
MCAL은 그 projection을 표시할 뿐 정의를 생성·덮어쓰기·release하는 authority가 아니다.
모든 cue는 정확한 정의 reference와 “암기용 풀이” 경계를 가진다.

## 4. 한자·어근 안전성

- 출처 없는 한자·어근을 추측하지 않는다.
- disputed/unknown은 hold.
- pedagogic-only 해석은 어원이라고 표시하지 않는다.
- 안전한 분해가 없으면 분해하지 않는다.
- profile별 과목·언어·권리 검토를 독립 수행한다.

## 5. Cue fading과 evidence

```text
FULL → DECOMPOSITION_ONLY → PROMPT_ONLY → HIDDEN
```

답변 전에 decomposition·memory gloss·prompt 중 어떤 단서든 표시하면 assistance/exposure다.
`CueExposureEvent`는 별도 ledger를 만들지 않고 canonical Assistance/Exposure ledger를 재사용한다.
`BEFORE_RESPONSE`는 `LOW` 또는 `MATERIAL`만 허용하며 `NONE`은 invalid다. `NONE`은 해당
attempt에 pre-response cue exposure가 없었다는 뜻이다. timing과 classification은 canonical
ledger에서 파생하고 client 입력을 신뢰하지 않는다. sequence에 pre-response event가 하나라도
있으면 independent retrieval·far transfer·stable D+7은 부적격이며 뒤의 event가 복구하지 못한다.
ordering ambiguity와 render/submit race도 fail closed다.
단서 바이트는 렌더 전에 원자적으로 기록되어야 하며 기록 실패 시 표시하지 않는다.
`HIDDEN`은 DOM·SSR·접근성 text·prefetch·cache·direct API output 어디에도 cue byte가 없음을 뜻한다.
D+7 stable과 timed integration은 cue hidden, non-same representation,
unresolved scoring conflict 0을 요구한다.

## 6. 표면 규칙

- memory card 기본 collapsed이며, 선기록 없는 기본 접힘 상태에는 formal term만 보인다.
- decomposition을 접힘 상태에 미리 표시하려면 exposure를 렌더 전에 원자적으로 기록한다.
- expanded 최대 1개.
- primary semantic highlight 최대 3개이며 revision-bound typed anchor가 필수다.
- color-only 의미 금지; text label과 accessible name 필수.
- primary response를 가리지 않는다.
- Today에 네 번째 primary task를 만들지 않는다.

## 7. 개인 주석

개인 자유문장은 마지막 단계다. Personal Raw Vault, owner isolation, retention,
export/delete, RLS/Storage/provider, backup, logs/traces, sync conflict, hostile
cross-user 검증을 별도 승인하기 전 구현하지 않는다.

개인 메모·제3자 원문 anchor는 shared VESG, Exam World, generator, analytics,
training 또는 다른 사용자 응답으로 승격하지 않는다.

`LEARNER_ATTEMPT_RANGE`와 `PRIVATE_SOURCE_RANGE`는 owner-bound `LEARNER_PRIVATE` 및
`VAULT_LOCAL_ONLY`로 강제한다. private target digest는 vault-local integrity metadata일 뿐이며,
non-vault에는 excerpt·offset·locator·attempt reference·digest·identifier가 없는 bodyless receipt만
허용한다. shared graph·analytics·logs·cache index·cross-user·Portable Core content projection은 금지한다.

## 8. Portable Core

공통 코어는 cue·component·anchor·fading·exposure·highlight interface만 재사용한다.
각 ExamProfile이 용어·정확한 정의·한자/어근·암기말·권리·현재성·검토자를 소유한다.
cross-profile cue·정답·mastery 상속은 금지한다.

## 9. 비승인 경계

이 결정은 다음을 승인하지 않는다.

- runtime/UI/API/schema/persistence/dependency;
- 실제 용어목록·사전·교재·기출 처리;
- 개인 주석 저장·동기화·export·analytics;
- 제1차 또는 다른 시험 activation;
- MCAL-1 용어 구축, MCAL-2 포스트잇 runtime, MCAL-3 하이라이트 runtime, MCAL-4 편집기 runtime;
- released VESG concept 없는 MCAL-1 term;
- CPF-2A closure와 approved bodyless exposure path 없는 MCAL-2;
- roadmap/WIP, CPF-2A, PR #692 변경;
- Ready, merge, auto-merge.

## 10. 완료조건

- V13 single active pointer 유지.
- MCAL annex/decision/JSON/QA/test 연결.
- 모든 authorization false.
- strict JSON, path, fence, focused tests 통과.
- released·versioned VESG definition projection과 mnemonic separation.
- canonical Assistance/Exposure ledger 재사용과 render-before-record 금지.
- HIDDEN byte absence와 revision-bound typed anchor.
- MCAL-1~MCAL-4 authorization false.
- cue fading/evidence/source safety/portable profile gates.
- runtime·roadmap·CPF-2A·PR #692 변화 0.
