# 한번 눌러 이해하기 v1

별도 사전이나 자유 채팅이 아니라 현재 문제·답안·풀이의 정확한 위치에서 여는
도움이다. 기본 표시는 가장 관련 있거나 불확실한 1–3개만 조용히 표시한다.
카드를 닫으면 답안 초안, 타이머, 스크롤과 초점을 보존한 채 원래 anchor로
돌아간다.

확정된 Capture/review에서 후보를 한 번 추출하고, 같은 정확한 version과 안전한
scope의 cached/precompiled card를 먼저 즉시 연다. 매 tap마다 strongest model을
호출하지 않는다. `더 쉽게`처럼 학습자가 명시적으로 요청할 때만 기존 비용·
data-class 경계 안에서 추가 provider를 고려하며, 실패는 기본 카드나 안전한
unavailable 상태로 돌아간다.

개인 업로드에서 만든 card·진단은 그 학습자와 정확한 source revision에만
속한다. 다른 학습자나 shared cache로 재사용하지 않는다. 공유 정의·예시는
별도의 권리와 source basis가 있는 경우에만 허용한다.

## 도움 단계

1. `뜻만 보기`: 한 줄 뜻과 필요한 기호·단위. 현재 답이나 수치 결과는 없다.
2. `이 문제에서 보기`: 현재 문제의 입력·출력 역할과 헷갈리는 경계.
3. 실무 `계산 순서 보기`, 이론·법규 `답안에 적용하기`: 적용 순서와 강한 도움.

강한 도움 본문은 `ContextualHelpExposureV1`을 append-only·idempotent하게
먼저 기록한 뒤 반환한다. 카드 열기와 읽기는 성공, 숙달, `CURRENTLY_CLEAR`,
D+1/D+7/제한시간 증거가 아니다. 같은 세션의 10초 확인도 학습 증거일 뿐
독립 지연 확인을 대체하지 않는다. `처음 봐요`, `헷갈려요`, 실패 또는 실제
간극 결속이 있을 때만 복습 후보를 만들 수 있다.

## 닫힌 계약

- `DetectedLearningConceptV1`: source revision·anchor·subject·kind·confidence·
  relevance reason·private scope
- `TermExplanationCardV1`: 쉬운 뜻·현재 역할·혼동 경계·적용/비적용·10초 확인·
  source/claim state
- `FormulaExplanationCardV1`: 뜻·공식·변수·단위·조건·현재 입력·결과 참조·부호·
  반올림·역검산·함정·dependency graph·calculator routine
- `FormulaDependencyGraphV1`: versioned acyclic upstream/operation/downstream graph
- `ContextualHelpExposureV1`: learner/session/revision/anchor/help level, body-before
  commit 금지, replay 안전
- `RecallCheckV1`: exact card version·closed answer·assistance·result, mastery 자동
  승격 금지

## 과목별 권위

- 실무: 결정론 수치·단위·부호·반올림·역검산이 모델보다 우선한다. 충돌하면
  숫자를 숨기고 `확인이 필요해요`로 막는다. graph의 cycle, 누락, 단위 불일치는
  fail closed다.
- 이론: 쉬운 정의, 목표 범위, 이 문제의 역할, 인접 개념 비교, 짧은 목차 회상.
  단일 AI 목차를 공식 답안으로 부르지 않는다.
- 법규: 뜻, 쟁점·요건·효과, 출처·anchor·시행 버전·현행성, 사안 적용 경계.
  출처가 누락·오래됨·충돌이면 검증된 결론을 내지 않는다.

카드는 exact concept/formula/version과 안전한 scope로 먼저 조회하고, 기존
compiled card를 즉시 연다. 현재 값은 가능한 경우 결정론으로 결속한다. 매 tap
마다 strongest model을 호출하지 않는다. provider 실패는 base card 또는 안전한
불가 상태이며 성공·증거·사용량을 만들지 않는다.

개인 업로드에서 나온 후보와 카드는 해당 학습자에게만 속한다. 원문·답안·OCR·
첨부를 shared cache, analytics, generation 또는 training으로 보내지 않는다.
공유 정의·예시는 별도 권리와 출처가 있어야 한다.
