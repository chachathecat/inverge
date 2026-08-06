---
decision_title: "답안길 감정평가사 전범위 Coverage Compiler·Original Question Engine Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
strategy_scope:
  - "감정평가사 제1차 5개 과목과 제2차 3개 과목의 공식 출제영역·현행법·기출·선행개념을 하나의 versioned concept graph로 편성"
  - "권리 정리된 자료와 독립적인 개념 계약에서 원문 비복원형 맞춤 문제를 생성·검증·배포"
  - "Private Ephemeral Book Tutor가 발견한 개념·오류만 개인 학습상태로 연결하고 제3자 원문은 공용 corpus로 승격하지 않음"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
coverage_spec: "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md"
machine_contract: "config/dabangil-appraiser-coverage-engine-v1.json"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment or Production changes"
  - "제1차 learner-facing runtime activation"
  - "실제 무라이선스 교재 원문의 공용 저장·검색·RAG·embedding·training·evaluation 편입"
  - "공식답안·공식채점기준·합격보장·출제확정 주장"
execution_rule: "실제 구현은 live authority, current law/provider state, source rights, deterministic validators, hostile acceptance와 별도 exact-scope Owner 승인을 다시 확인한 뒤 단계별로 수행한다."
---

# Owner 결정 — 감정평가사 전범위 Coverage Compiler와 Original Question Engine

## 1. 결정

답안길의 장기 콘텐츠 전략은 다음 두 엔진으로 고정한다.

```text
Primary
Official Coverage Compiler
→ Original Concept Curriculum
→ Synthetic Question Engine
→ deterministic verifier
→ evidence-gated mastery

Secondary
Private Ephemeral Book Tutor
→ 사용자가 선택한 한 문제의 일회성 분석
→ concept/error signature만 개인 학습상태에 연결
→ 원문·OCR·출판사 해설·source-bound 전체풀이의 공용 축적 0
```

문제집은 사용자가 실제 공부에 활용할 수 있는 개인 companion이다. 그러나
답안길의 전범위 커버리지와 반복훈련 능력은 특정 상업 문제집을 복제하거나
여러 사용자의 업로드를 모아 만드는 것이 아니라, 공식 출제영역·현행 법령과
회계기준·공식 기출의 출제형식·독립적인 선행개념 graph에서 만든다.

## 2. “완벽한 커버”의 정확한 의미

답안길은 `시험에 무조건 나온다`, `이것만 보면 된다`, `100% 적중`을 주장하지
않는다. 미래 시험문제는 확정적으로 예측할 수 없다.

이 결정에서 `complete coverage`는 다음의 bounded completeness를 뜻한다.

1. 현재 시행령 별표의 모든 시험과목을 빠짐없이 포함한다.
2. 공식 출제영역 문서의 모든 주요항목·세부항목을 leaf까지 매핑한다.
3. 기준연도 범위의 공식 기출 모든 문항을 하나 이상의 concept·skill·trap에
   매핑한다.
4. 법률·시행령·시행규칙·감정평가 실무기준·시험일 적용 K-IFRS의 유효시점을
   확인한다.
5. 직접 출제항목뿐 아니라 풀이에 필수인 prerequisite와 1차↔2차 bridge를
   명시한다.
6. 각 active concept에 진단·연습·전이·간격복습·시간제한 문제군과 검증기를
   갖춘다.
7. 공식 범위 또는 적용기준이 바뀌면 drift를 탐지하고 영향 노드를 hold한다.

커버리지 지표 100%는 `정의된 source universe에 대한 매핑 완결성`이지
`실제 시험 적중률 100%`가 아니다.

## 3. Source authority

Coverage Compiler의 기본 우선순위는 다음과 같다.

```text
1. 시험일 현재 시행 중인 법률·시행령·시행규칙·회계기준
2. 감정평가사법 시행령 별표의 시험과목
3. 해당 연도 Q-Net 시행계획과 정정공고
4. 공식 출제영역 문서
5. Q-Net 공식 기출문제·최종정답과 공개 이용조건
6. 감정평가에 관한 규칙·감정평가 실무기준 등 공식 기준
7. 답안길이 독립적으로 편성한 prerequisite·transfer curriculum
8. 상업 수험서·강의자료는 사용자 개인 companion 또는 별도 license 범위
```

오래된 공식 출제영역 문서가 현재 법령명과 충돌하면 현재 시행령과 시험일
현재 법령을 따른다. 과거 기출의 정답은 당시 기준으로 보존하되, 현재 문제로
재사용할 때는 현행법·현행 회계기준으로 재검증한다.

## 4. 전범위 product scope

전략상 coverage는 다음을 모두 포함한다.

```text
제1차
- 민법 중 총칙·물권
- 경제학원론
- 부동산학원론
- 감정평가 관계 법규
- 회계학

제2차
- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규
```

현재 learner-facing runtime scope는 기존 권위대로 제2차 3과목에 한정한다.
제1차 coverage graph·generator·validator는 전략과 compiler 대상으로 정의할
수 있으나 실제 navigation, API, persistence, learner activation은 별도 Work가
필요하다.

## 5. Concept priority

모든 concept는 다음 중 하나로 분류한다.

```ts
type ConceptPriorityV1 =
  | "foundation"   // 다른 문제군의 전제라서 반드시 닫아야 함
  | "recurrent"    // 여러 연도·형식에서 반복 관측됨
  | "rotation"     // 공식 범위 안에서 순환 출제되는 독립 영역
  | "bridge"       // 1차↔2차 또는 과목 간 전이를 만드는 선행개념
  | "watch"        // 개정·신기준·새로운 출제형식 관찰 대상
  | "retired";     // 현행 범위에서 이탈했으나 과거 기출 해석을 위해 보존
```

빈도만으로 삭제하지 않는다. 공식 범위에 속하지만 최근 출제가 적은 영역은
`rotation`으로 남긴다. `foundation`은 적중예측이 아니라 학습 의존성에 따른
우선순위다.

## 6. Original Concept Curriculum

각 concept node는 최소한 다음을 갖는다.

```ts
type AppraiserConceptNodeV1 = {
  conceptId: string;
  stage: "first" | "second" | "bridge";
  subjectId: string;
  domainId: string;
  parentConceptIds: string[];
  prerequisiteConceptIds: string[];
  officialScopeRefs: string[];
  currentAuthorityRefs: string[];
  pastQuestionRefs: string[];
  priority: ConceptPriorityV1;
  effectiveFrom?: string;
  effectiveTo?: string;
  mustKnowClaims: string[];
  mustDoSkills: string[];
  misconceptionCodes: string[];
  questionFamilyIds: string[];
  verifierIds: string[];
  masteryGateId: string;
  rightsClass: "owned" | "official_permitted" | "metadata_only";
  releaseStatus: "draft" | "validated" | "held" | "retired";
};
```

정의·공식만 저장하는 사전이 아니라 다음을 연결한다.

```text
무엇을 아는가
왜 그런가
어디에서 쓰는가
무엇과 혼동하는가
어떤 조건에서 예외인가
어떤 문제형식으로 변하는가
무도움으로 무엇을 해야 통과인가
```

## 7. Synthetic Question Engine

생성기는 상업 교재 원문을 공용 seed로 사용하지 않는다. 입력은 다음으로
제한한다.

```text
validated concept graph
권리 정리된 답안길 설명·예제
이용조건이 확인된 공식 자료
current law / standard snapshot
difficulty and misconception policy
learner-private closed mastery state
```

출력은 `candidate → solver/validator → critic → release artifact` 순서를 통과한다.

- 제1차 문제는 정답 유일성, 선택지 독립성, distractor 근거와 시간 적합성을
  검증한다.
- 실무 계산문제는 단위·합계·경계·반올림·복수풀이 정합과 계산기 재현성을
  검증한다.
- 이론 문제는 요구동사·배점·핵심논점·반론·실무연결과 reference outline을
  검증한다.
- 법규 문제는 시험일 유효 법령·조문·판례상태·쟁점·소송형식·포섭 정합을
  검증한다.

생성 reference answer는 학습용 후보이며 공식답안이나 공식 채점기준으로
표시하지 않는다.

## 8. Book Tutor와의 연결

사용자가 한 권 전체를 장기간 공부하는 것은 허용할 수 있다. 이때 `한 문제`는
사용자 생애 또는 책 한 권의 총량 제한이 아니라 한 번의 ephemeral processing
job 단위다.

```text
문제 1개 촬영
→ transient analysis
→ concept signature
→ misconception / skill-gap signature
→ 원문·OCR·source-bound output 폐기
→ concept graph에서 독립 변형문제 생성
→ 무도움 transfer 확인
→ 개인 mastery evidence 저장
```

금지되는 것은 다음이다.

- 책 전체 PDF·연속 페이지 일괄 ingest
- 출판사 답지·예시답안의 일괄 변환
- 사용자 업로드를 공용 generator corpus로 편입
- 여러 사용자의 입력을 합쳐 책별 문제은행·해설집 완성
- 책 제목·문제번호만으로 source-bound 답안을 호출
- source 표현을 다른 이용자의 문제·설명에 재사용

## 9. 첨부형 학습경험의 교정

사용자에게 필요한 것은 단순한 정답보다 다음과 같은 층위다.

```text
정확한 용어 구별
중학생 수준의 직관
왜 그 식을 쓰는지
표·계산 순서
흔한 오개념
시험 답안으로 압축하는 방법
새 수치·새 구조에서 무도움 전이
```

다만 특정 교재의 `정확한 용어 정의와 계산 구조에 맞춰 다시 정리`하는
방식은 Private Book Tutor 세션에서만 제한적으로 다룬다. Original Curriculum은
같은 개념을 독립적인 사실관계·수치·표·설명구조로 재구성한다.

## 10. Mastery와 evidence

문제 노출이나 AI 해설 열람은 mastery가 아니다.

```text
recognition
→ explanation in learner's words
→ single-skill application
→ mixed application
→ unseen transfer without help
→ D+1 / D+7 recovery
→ timed integration
```

`guided`, `full_reveal`, `answer_seen`은 assistance/exposure로 기록하고 독립
성취로 승격하지 않는다. 안정 후보에는 최소 D+7 unseen verified transfer를
요구한다.

## 11. Coverage release gates

외부 활성화 전 최소 조건은 다음과 같다.

1. 공식 과목·주요항목·세부항목 mapping 100%
2. 선택한 historical window의 공식 기출 문항 mapping 100%
3. active law/accounting node의 currentness unknown 0
4. source 없는 active concept 0
5. validator 없는 released question family 0
6. 정답 다중성·단위불일치·조문 drift·답안 rubric 공백 0
7. 상업 교재 원문과 장문 중복 또는 고유 표·사례 복원 0
8. user-source-derived item의 shared corpus 편입 0
9. generated answer의 공식답안 오인 표시 0
10. held-out transfer set과 training/calibration set 오염 0

## 12. 실행 순서

```text
ACC-0  source universe·권리·유효일 freeze
ACC-1  official scope and current subject registry
ACC-2  1차/2차 concept graph seed
ACC-3  official past-question mapping and coverage gaps
ACC-4  prerequisite·bridge·misconception graph
ACC-5  original question templates and deterministic solvers
ACC-6  subject-specific generators and validators
ACC-7  mastery/evidence integration
ACC-8  Private Book Tutor concept-signature bridge
ACC-9  law/accounting drift watcher
ACC-10 hostile quality·copyright·measurement acceptance
ACC-11 Owner-private synthetic/rights-cleared dogfood
ACC-12 separately authorized learner-facing activation
```

## 13. 최종 불변식

> 답안길은 남의 문제집을 많이 보유해서 전범위를 커버하지 않는다. 공식 범위와
> 현행 기준을 concept graph로 완전히 매핑하고, 그 graph에서 검증 가능한
> 독창 문제를 생성하며, 사용자가 가진 책은 개인 companion으로만 연결한다.

> 답안길의 성취는 “이 문제를 본 적 있다”가 아니라 “처음 보는 표현·수치·사실
> 관계에서도 개념을 설명하고 제한시간 안에 적용했다”는 evidence다.
