# Inverge / 답안길 감정평가사 2차 Premium OS 최종 제품 명세

- 문서 상태: **제품 헌법 / 구현 Source of Truth**
- 결정일: 2026-06-25
- S200R 정렬일: 2026-06-26
- 적용 범위: learner app, AI answer engine, reference corpus, pricing, academy console, Agent Factory roadmap
- 관련 이슈: #431, #437
- 우선순위: 이 문서와 `docs/dabangil-second-exam-premium-os.md`, `AGENTS.md`, `roadmap/active-program.yml`이 충돌하면 **이 문서의 제품 결정, S200R premium OS brief, 최신 active program을 우선**한다.

---

## 0. 최종 결정

Inverge는 내부 codename 및 repository name이다.

Learner-facing brand는 **답안길**이다.

Premium product는 **답안길 2차 합격관제 OS**다.

사용자에게 보이는 핵심 포지셔닝은 아래로 고정한다.

> 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS

지원 과목은 아래 세 과목으로 고정한다.

1. 감정평가실무
2. 감정평가이론
3. 감정평가 및 보상법규

세 과목은 내부적으로 순차 개발할 수 있으나, **세 과목 모두가 완성되고 통합 품질 게이트를 통과하기 전에는 공개 유료 출시하지 않는다.** 법규만 먼저 공개 판매하거나, 일부 과목을 완성품처럼 판매하지 않는다.

감정평가사 1차 코드는 즉시 삭제하지 않는다. 다만 신규 개발, 랜딩 노출, 온보딩, 유료 상품, active roadmap에서는 동결한다.

답안길이 판매하는 핵심 가치는 다음과 같다.

> 공식 source와 권리 상태가 확인된 기출을 기준으로 내 답안을 Evidence Review하고, 가장 큰 간극 1개와 다음 행동 1개를 제시하며, GIII 실무 루틴·이론 문단·법규 포섭을 시험일까지 재작성·재계산·복습으로 운영한다.

### 0.1 공장용 결정 요약

```yaml
product:
  name: Inverge
  learnerBrand: 답안길
  premiumProduct: 답안길 2차 합격관제 OS
  category: 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS
  learnerScope:
    - 감정평가실무
    - 감정평가이론
    - 감정평가 및 보상법규
  practicalCalculator: casio_fx_9860giii
  firstRoundStatus: frozen_hidden_no_new_work
  publicPaidLaunchRequires:
    - law_module_complete
    - theory_module_complete
    - practice_module_complete
    - all_historical_questions_ingested_or_rights_blocked_explicitly
    - reference_answer_quality_gate_passed
    - answer_review_quality_gate_passed
    - error_notebook_and_concept_tracking_complete
    - billing_privacy_cost_guardrails_complete
    - three_subject_e2e_acceptance_passed
  learnerProducts:
    - free
    - second_os_basic
    - second_os_pro
    - second_control_premium
  oneOffSkus:
    - deep_review_5
    - deep_review_15
    - deep_review_40
  laterDisabledSkus:
    - managed_cohort
    - season_pass
  excludedLearnerProducts:
    - expert_human_review
    - pass_probability
    - official_grading_claim
    - guaranteed_model_answer_claim
    - unlimited_second_exam_precision_review
  b2bProduct:
    - academy_answer_operations_console
```

---

## 1. 제품 포지셔닝

### 1.1 사용자에게 보이는 정의

사용 권장 문구:

- 답안길
- 답안길 2차 합격관제 OS
- 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS
- Evidence Review / 답안 검토 리포트
- 가장 큰 간극 1개와 다음 행동 1개
- GIII 실무 루틴
- 재작성·다시 계산·오답노트·핵심개념 추적

사용 금지 문구:

- 공식 채점
- 실제 시험 점수 확정
- 합격 가능성 또는 합격 확률
- 합격 보장
- 공식 모범답안
- AI가 최종 판정
- 무조건 맞는 정답

### 1.2 제품 약속

답안길은 다음을 약속한다.

- 공식 source와 권리 상태가 확인된 과거 기출 metadata를 연도·회차·과목·문항 단위로 관리한다.
- 사용자의 답안을 사진, PDF, 텍스트로 받는다.
- OCR 결과를 사용자가 확인·수정한 뒤 분석한다.
- 과목별 루브릭으로 Evidence Review, 연습점수 범위, 감점 후보, 신뢰도를 보여준다.
- 가장 큰 간극 1개, 다음 행동 1개, 누락 논점, 약한 계산 단계, 약한 문단을 구체적으로 지적한다.
- 감정평가실무에서는 `casio_fx_9860giii` reset-safe hand-keyed routine을 핵심 훈련 대상으로 둔다.
- 사용자가 답안을 제출한 뒤 검증형 학습 기준답안을 제공한다.
- 사용자가 다시 쓴 답안을 이전 답안과 비교한다.
- 반복 오류와 핵심개념을 자동 오답노트와 개인 개념 그래프에 누적한다.
- 다음 복습·재작성·유사 기출을 자동으로 배치한다.
- Today Plan은 최대 3개 primary task만 제시한다.

### 1.3 연습점수의 의미

B2C에서도 채점형 가치를 제공하되 단일 확정 점수로 과장하지 않는다.

- 기본 출력: `예상 점수 범위`, `루브릭별 획득 가능 점수`, `감점 후보`, `신뢰도`
- 예시: `48~56점 / 신뢰도 보통`
- 점수 범위는 학습용 추정치다.
- 입력자료가 부족하거나 기준답안 신뢰도가 낮으면 `점수 추정 보류`가 가능해야 한다.
- 합격 가능성 시뮬레이션은 제공하지 않는다.
- 점수-like 결과는 Evidence Review의 끝이 아니라 재작성, 다시 계산, 또는 복습의 근거다.

---

## 2. 공개 출시 원칙

### 2.1 전과목 완성 후 공개

공개 유료 출시는 다음 조건을 모두 충족해야 한다.

- 법규 엔진 완료
- 이론 엔진 완료
- 실무 엔진 완료
- 세 과목 공통 답안 저장·재작성·오답추적 완료
- 기출 수집률과 권리 상태 확인 완료
- 검증형 기준답안 패키지 생성 완료
- 연습채점·첨삭 품질평가 통과
- 결제·사용량·개인정보·비용 상한 완료
- 모바일 실제 사용자 흐름 통과

내부 알파와 제한 베타에서는 과목별 순차 검증이 가능하다. 그러나 랜딩, 가격표, 결제 화면에서 세 과목 중 일부만 완성된 상태를 전과목 제품처럼 판매하지 않는다.

### 2.2 개발 순서

내부 개발 순서는 다음을 권장한다.

1. 공통 답안 커널
2. 전체 기출 source registry와 canonical schema
3. 법규 검증 엔진
4. 이론 검증 엔진
5. 실무 계산·검산 엔진
6. 검증형 기준답안 생성 파이프라인
7. 오답노트·개념 그래프
8. 요금제·결제
9. 학원 콘솔
10. 세 과목 통합 E2E와 공개 출시

개발 순서는 순차지만 공개 제품 범위는 항상 전과목이다.

---

## 3. 핵심 사용자 루프

### 3.1 기본 골든 루프

```text
기출 선택
→ 문제 요구 파악
→ 답안 작성 또는 촬영
→ OCR 확인·수정
→ 연습채점 + 정밀첨삭
→ 가장 큰 간극 1개 확인
→ 검증형 기준답안 전체 보기
→ 내 답안과 문단·계산 단계 비교
→ 즉시 재작성
→ 재채점 및 개선폭 확인
→ 자동 오답노트·핵심개념 저장
→ 다음 복습·유사 기출 예약
```

### 3.2 답안 공개 원칙

기준답안은 반드시 제공한다. 다만 학습 효과를 위해 기본값은 `attempt before reveal`이다.

- 사용자가 답안을 제출하면 즉시 전체 기준답안을 볼 수 있다.
- 답안을 쓰지 않은 사용자는 Skeleton과 핵심 논점만 먼저 볼 수 있다.
- 사용자가 원하면 확인 단계를 거쳐 전체 기준답안을 열 수 있다.
- 답안을 숨겨 결제를 유도하는 불안 기반 패턴은 금지한다.
- 무료 1회 첨삭에서도 전체 기준답안을 경험하게 한다.

### 3.3 한 화면 한 행동

각 화면의 주행동은 하나만 둔다.

- 문제 화면: `답안 작성 시작`
- 업로드 화면: `OCR 확인`
- 결과 화면: `가장 큰 간극 고치기`
- 기준답안 화면: `내 답안과 비교`
- 재작성 화면: `다시 쓴 답안 제출`
- 오답노트 화면: `오늘 복습 시작`

---

## 4. 세 과목 전용 엔진

## 4.1 감정평가 및 보상법규

### 답안 구조

```text
쟁점 제시
→ 관련 법령·법리·판례
→ 요건 분해
→ 사안 포섭
→ 결론
```

### 탐지 대상

- 쟁점 누락 또는 잘못된 쟁점 방향
- 법령·조문·판례의 부정확한 인용
- 시험 당시 시행 법령과 현재 법령 혼동
- 요건 누락
- 포섭 부족
- 결론과 근거 불일치
- 목차·문단 구조 문제
- 핵심 키워드 누락

### 검증기

- 시험일 기준 법령 버전 확인
- 조문 번호·명칭 확인
- 판례 존재·취지 확인
- 법리와 포섭 문장 분리 확인
- 근거가 없으면 단정하지 않고 `검토 필요` 처리

## 4.2 감정평가이론

### 답안 구조

```text
문제의 쟁점·의의
→ 개념 정의
→ 이론적 근거·배경
→ 구성요소 또는 비교
→ 문제 적용·평가
→ 결론
```

### 탐지 대상

- 정의 누락·왜곡
- 개념 간 혼동
- 이론적 근거 부족
- 나열형 답안
- 비교 기준 불일치
- 문제 요구와 무관한 장황한 서술
- 핵심 키워드 누락
- 추상적 결론
- 문장 압축 실패

### 검증기

- 공식 기준·공개 전문자료와 개념 일치
- 개념 그래프 내 상·하위 관계 확인
- 동일 용어의 문맥별 의미 구분
- 주류 설명과 대안적 설명 분리
- 출처가 약한 이론은 신뢰도 하향

## 4.3 감정평가실무

### GIII 실무 루틴 고정

실무 계산 훈련의 practical calculator model은 `casio_fx_9860giii`로 고정한다.

필수 원칙:

```text
시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다.
```

실무 루틴은 formula, extracted values, CASIO fx-9860GIII hand-keyed sequence, expected display, unit check, rounding check, answer-sheet transfer template, common mistake warnings, reset-safe routine, no stored-program dependency를 포함해야 한다.

계산기 program storage를 시험 전략으로 가르치지 않는다.

### 답안 구조

```text
전제조건·기준시점·평가목적
→ 자료 선택과 배제 근거
→ 적용 방식·산식
→ 계산 과정
→ 단위·반올림·시점수정
→ 검산
→ 최종 판단·답안 문장
```

### 탐지 대상

- 전제조건 누락
- 자료 선택 오류
- 비교사례·표준지 선택 오류
- 산식 오류
- 숫자 대입 오류
- 단위·면적·기간·비율 오류
- 반올림·천원/원 변환 오류
- 중간 계산 누락
- 검산 불일치
- 계산은 맞지만 답안 서술이 부족한 경우
- 시간 배분 실패

### 검증기

- deterministic calculator
- 단위·차원 검사
- 독립 재계산
- 역산 검산
- 합계·비율·시점 검증
- 허용 오차 정책
- 표 OCR confidence gate
- 지원하지 않는 유형에 대한 fail-closed 처리

실무에서 계산 검증을 통과하지 않은 기준답안은 공개하지 않는다.

---

## 5. 모든 과거 기출문제 수집 체계

### 5.1 목표

공식적으로 확보 가능한 감정평가사 2차의 모든 연도·회차·세 과목 기출을 수집한다.

완료 기준은 단순 파일 개수가 아니다. 각 문항에 다음 정보가 있어야 한다.

- 공식 출처
- 연도·회차·교시·과목·문항번호
- 배점과 세부 물음
- 원본 파일 hash
- 원문 추출 상태
- 표·수식·이미지 상태
- 권리 상태
- 시험일과 적용 법령 기준일
- 문제 요구사항 구조화
- 논점 지도
- 기준답안 패키지 상태
- 품질검증 상태

### 5.2 source/rights 원칙

기출문제는 공개되어 있다는 이유만으로 재배포 가능하다고 가정하지 않는다.

각 source record는 다음을 포함한다.

```ts
type HistoricalQuestionSource = {
  sourceId: string;
  officialUrl: string;
  sourceAgency: string;
  fetchedAt: string;
  fileHashSha256: string;
  rightsStatus:
    | "redistribution_allowed"
    | "display_by_deep_link"
    | "private_reference_only"
    | "needs_legal_review";
  displayMode:
    | "full_text"
    | "official_file_embed"
    | "metadata_and_link"
    | "operator_only";
  verifiedAt?: string;
  verificationNote?: string;
};
```

권리 확인 전에는 다음을 지킨다.

- 원본 링크와 metadata를 먼저 저장한다.
- raw PDF를 공개 번들에 포함하지 않는다.
- 전체 원문 노출이 불확실하면 공식 파일 링크 또는 metadata UI를 사용한다.
- 제3자 학원 문제·답안·해설을 허가 없이 수집하지 않는다.

### 5.3 canonical question schema

```ts
type SecondRoundQuestion = {
  id: string;
  year: number;
  round: number;
  subject: "practice" | "theory" | "law";
  questionNo: number;
  subQuestions: Array<{
    id: string;
    label: string;
    points: number;
    requirement: string;
  }>;
  totalPoints: number;
  sourceId: string;
  problemTextStatus: "verified" | "needs_visual_check" | "blocked_by_rights";
  tableFormulaStatus?: "verified" | "needs_visual_check" | "not_applicable";
  examDate: string;
  lawEffectiveDate?: string;
  topicTags: string[];
  conceptNodeIds: string[];
  issueMapId?: string;
  rubricId?: string;
  referenceAnswerPackageId?: string;
};
```

### 5.4 수집 파이프라인

```text
공식 source registry
→ 파일 다운로드 및 hash
→ PDF/page inventory
→ 텍스트·표·수식 추출
→ 시각 원문 대조
→ 문항·세부 물음 분리
→ 배점 검증
→ 주제·개념 태깅
→ 과목별 issue map 생성
→ 기준답안 생성 큐
→ 품질 게이트
→ learner archive 노출
```

`문제 원문 검증 완료`와 `기준답안 검증 완료`는 별도 상태다.

---

## 6. 공식 답안이 없는 기출의 이상적 답안 생성

## 6.1 명칭

생성 결과를 `공식 모범답안`이라고 부르지 않는다.

사용 명칭:

> **답안길 검증형 학습 기준답안**

항상 아래 고지를 포함한다.

> 이 답안은 공식 채점기준 또는 공식 모범답안이 아닙니다. 공식 문제, 적용 법령·기준, 공개 전문자료와 다중 검증 절차를 바탕으로 만든 학습용 기준답안입니다.

## 6.2 기준답안 패키지

문항마다 하나의 긴 답안만 만들지 않는다. 다음 산출물을 하나의 패키지로 관리한다.

```ts
type ReferenceAnswerPackage = {
  questionId: string;
  subject: "practice" | "theory" | "law";
  requirementMap: RequirementMap;
  issueMap: IssueMap;
  scoringBlueprint: ScoringBlueprint;
  tenMinuteSkeleton: AnswerSkeleton;
  examTimeReferenceAnswer: FullReferenceAnswer;
  expandedStudyAnswer: FullReferenceAnswer;
  alternativeAcceptablePoints: AlternativePoint[];
  commonFailureModes: FailureMode[];
  sourceAnchors: SourceAnchor[];
  calculationTrace?: CalculationTrace;
  validationReport: ReferenceAnswerValidationReport;
  releaseStatus:
    | "draft"
    | "cross_checked"
    | "source_verified"
    | "released"
    | "blocked";
};
```

사용자에게는 최소 다음이 제공된다.

1. 배점·요구사항 지도
2. 목차 Skeleton
3. 시험시간형 전체 기준답안
4. 학습용 확장 답안
5. 핵심 채점 포인트
6. 다른 정당한 접근
7. 자주 틀리는 지점
8. 근거·검증 상태

## 6.3 생성 파이프라인

### 단계 1: 문제 요구 분해

- 세부 물음 분리
- 각 물음의 동사와 요구 수준 분리
- 배점과 답안 분량 가설
- 필수 사실관계와 계산자료 식별
- 시험 당시 적용 법령·기준일 식별

### 단계 2: source pack 작성

과목별 신뢰 가능한 source pack을 만든다.

법규:

- 시험일 기준 법령
- 시행령·시행규칙
- 관련 판례
- 공식 행정자료

이론:

- 공식 감정평가 기준
- 공개 전문자료
- 검증된 개념 노드
- 서로 충돌하는 견해가 있으면 견해별 근거

실무:

- 문제 원문 자료
- 공식 평가 기준
- 검증된 계산 규칙
- deterministic calculation functions
- 단위·반올림 정책

### 단계 3: 독립 후보 답안 생성

동일 문항에 최소 3개의 독립 후보를 생성한다.

- Candidate A: 논점·구조 우선
- Candidate B: 채점 포인트·완결성 우선
- Candidate C: 반례·누락 탐지 우선

가능하면 모델, prompt seed 또는 reasoning path를 분리한다. 하나의 출력을 반복 요약해 3개처럼 취급하지 않는다.

### 단계 4: 과목별 검증

법규:

- 조문·판례·시행시점 검증
- 요건과 포섭 일치
- 결론의 근거 존재

이론:

- 정의·개념 관계 검증
- 문제 요구와 답안 범위 일치
- 중복과 장황함 제거
- 대안 견해의 허용 가능성 분리

실무:

- 독립 재계산
- 단위·차원 검증
- 표의 합계·비율 검증
- 역산 검산
- 허용 오차 검증

### 단계 5: 반대검토 agent

별도 critic이 다음을 찾는다.

- 누락된 세부 물음
- 존재하지 않는 근거
- 잘못된 계산
- 문제 자료와 충돌
- 지나친 단정
- 배점 대비 불균형
- 문장형으로는 그럴듯하지만 채점 포인트가 없는 부분

### 단계 6: consensus merge

후보 간 일치 부분과 충돌 부분을 분리한다.

- 일치 + source 검증 완료: 높은 신뢰도
- 일치하지만 source 약함: 중간 신뢰도
- 후보 충돌: 자동 병합 금지, 명시적 불확실성
- 실무 계산 불일치: 공개 차단
- 법규 source 불일치: 공개 차단

### 단계 7: release gate

다음 조건을 모두 만족해야 `released`가 된다.

- 모든 세부 물음 반영
- 배점 합계 일치
- source anchor 존재
- 금지된 허위 출처 없음
- 실무 계산 검증 통과
- 법규 시행시점 검증 통과
- 과목별 구조 검증 통과
- critic의 blocker 0건
- 답안과 루브릭 상호 일치
- uncertainty가 사용자에게 표시됨

## 6.4 내부 검수 상태

전문가 검수 상품은 판매하지 않지만, 내부 운영상 선택적 human QA 상태는 허용한다.

```ts
type VerificationState = {
  automatedSourceVerified: boolean;
  automatedCrossChecked: boolean;
  calculationVerified?: boolean;
  internalHumanSpotChecked?: boolean;
  officialAnswerAvailable: boolean;
};
```

`internalHumanSpotChecked`는 제품의 필수 전제가 아니며 별도 소비자 상품도 아니다. 표시가 없다면 자동 검증 상태만 정확히 공개한다.

---

## 7. 연습채점과 정밀첨삭

### 7.1 결과 우선순위

결과 화면은 아래 순서로 보여준다.

1. 가장 큰 간극 1개
2. 다음 행동 1개
3. Evidence Review / 답안 검토 리포트
4. 재작성 또는 다시 계산 task
5. 자동 오답노트
6. 핵심개념 추적
7. paid tier weekly weakness report
8. GIII 실무 루틴, relevant practice calculation only
9. Deep Review Unit, paid high-cost review only
10. Today Plan max three

점수가 결과의 끝이 되어서는 안 된다.

예상 점수 범위와 루브릭별 점수·감점 근거는 evidence-backed, non-official, secondary summary로만 둔다.

### 7.2 루브릭 공통 계약

```ts
type PracticeScoreEstimate = {
  scoreRange: [number, number] | null;
  confidence: "low" | "medium" | "high";
  gradingStatus: "estimated" | "withheld_insufficient_evidence";
  rubricRows: Array<{
    criterionId: string;
    maxPoints: number;
    estimatedPointsRange: [number, number];
    evidenceFromLearnerAnswer: string[];
    deductionCandidates: string[];
    fixAction: string;
  }>;
  primaryGapId: string;
  caveat: string;
};
```

### 7.3 증거 원칙

- 모든 감점은 사용자의 실제 답안 일부 또는 계산 단계에 연결한다.
- 답안에서 찾을 수 없는 내용을 작성했다고 가정하지 않는다.
- 기준답안이 불확실하면 점수 신뢰도를 낮춘다.
- OCR confidence가 낮은 구간은 사용자가 확인하기 전 채점하지 않는다.
- 동일 root cause의 중복 감점을 제한한다.
- 재작성 후 동일 루브릭으로 재채점해 개선폭을 보여준다.

### 7.4 전체 답안 비교

비교 화면은 단순 diff가 아니다.

- 요구사항별 충족 여부
- 논점별 내 답안 위치
- 기준답안의 대응 문단
- 빠진 근거
- 불필요한 문장
- 계산 단계 차이
- 결론 차이
- 다시 쓸 문단 또는 계산 블록

---

## 8. 자동 오답노트와 핵심개념 추적

## 8.1 자동 생성 원칙

사용자가 별도로 오답노트를 작성하지 않아도 모든 첨삭과 재작성에서 자동 생성한다.

각 오류는 다음 구조로 저장한다.

```ts
type LearningGapRecord = {
  id: string;
  userId: string;
  questionId: string;
  subject: "practice" | "theory" | "law";
  conceptNodeIds: string[];
  gapType: string;
  severity: 1 | 2 | 3;
  confidence: number;
  evidenceExcerptIds: string[];
  whyWrong: string;
  correctPrinciple: string;
  immediateFix: string;
  rewriteId?: string;
  recurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  nextReviewAt: string;
  recoveryState: "new" | "repeated" | "improving" | "recovered" | "relapsed";
};
```

### 8.2 과목별 오류 taxonomy

법규:

- 쟁점 누락
- 법령·판례 오류
- 요건 누락
- 포섭 부족
- 결론 불명확
- 목차·논리 순서
- 핵심 키워드 누락

이론:

- 정의 부족
- 개념 혼동
- 근거 부족
- 비교축 오류
- 문제 요구 이탈
- 나열형 답안
- 추상적 결론
- 문장 압축 실패

실무:

- 전제조건 누락
- 자료 선택 오류
- 산식 오류
- 대입 오류
- 계산 오류
- 단위·반올림 오류
- 중간 과정 누락
- 검산 실패
- 결론 서술 부족
- 시간 배분

### 8.3 핵심개념 카드

각 반복 오류는 핵심개념 카드로 연결한다.

카드에는 다음을 표시한다.

- 개념명
- 한 문장 정의
- 내가 틀린 이유
- 올바른 판단 규칙
- 최소 예시
- 헷갈리는 인접 개념
- 연결된 기출
- 최근 답안 근거
- 다음 회상 질문
- 다음 복습일
- 숙련도와 재발 횟수

### 8.4 개인 개념 그래프

노드 상태는 단순 정답률이 아니다.

```ts
type PersonalConceptState = {
  conceptNodeId: string;
  exposureCount: number;
  errorCount: number;
  recurrenceCount: number;
  successfulRewriteCount: number;
  delayedRecallSuccessCount: number;
  lastConfidence: number;
  masteryEstimate: number;
  forgettingRisk: number;
  examImpact: number;
  lastSeenAt: string;
  nextReviewAt: string;
};
```

오늘 계획은 다음 우선순위로 최대 3개만 보여준다.

```text
시험 영향도
+ 반복 오류
+ 최근 재발
+ 망각 위험
+ 미완료 재작성
+ 유사 기출 전이 가치
+ 오늘 가용시간 적합도
```

### 8.5 복구 루프

```text
오류 발견
→ 핵심개념 카드
→ 짧은 회상
→ 문단/계산 다시쓰기
→ 유사 기출 1개
→ 지연 회상
→ recovered 또는 relapsed 판정
```

---

## 9. 기출 아카이브 UX

기출 아카이브는 제품의 핵심 탐색 표면이다. 다만 자료실처럼 끝없이 탐색하게 하지 않는다.

### 기본 필터

- 연도
- 과목
- 배점
- 주제
- 핵심개념
- 아직 안 푼 문제
- 틀린 개념과 관련된 문제
- 다시 풀 시점이 된 문제
- 기준답안 검증 상태

### 문제 카드

- 연도·과목·문항·배점
- 예상 소요시간
- 핵심 주제
- 출처 상태
- 내 최근 기록
- 재풀이 필요 여부
- `풀기` 주행동

### 문제 상세

- 공식 문제 또는 공식 source 링크
- 세부 물음과 배점
- 답안 작성
- 제출 후 연습채점·첨삭
- 기준답안
- 연결된 개념·유사 기출

---

## 10. 요금제와 가격

아래 가격은 **S200R final target list-price hypothesis**다. 결제 전환, AI 비용, 유지율로 검증하되 제품 구현은 이 taxonomy를 기준으로 한다.

가격은 configurable and versioned로 관리한다. UI/API에 흩어진 literal로 hard-code하지 않는다.

## 10.1 `free`

가격: 0 KRW

- 계정당 평생 full-value review 1회
- 세 과목 중 하나 선택
- 1회에 한해 OCR 확인, Evidence Review, 연습점수 범위, 답안 검토 리포트, 검증형 학습 기준답안, 답안 비교, 재작성 또는 다시 계산, 오답노트·핵심개념 카드를 경험
- 결제 전에도 가격·데이터 정책·검증 상태를 명확히 확인 가능

무료 결과를 의도적으로 저품질로 만들지 않는다. 한 번의 완전한 가치 경험으로 전환을 검증한다.

## 10.2 `second_os_basic`

정가 가설: **월 59,000~69,000원**

- 법규·이론·실무 전과목
- 권리 상태가 허용하는 범위의 기출 metadata 탐색
- Evidence Review / 답안 검토 리포트
- 가장 큰 간극 1개와 다음 행동 1개
- 재작성 또는 다시 계산
- 자동 오답노트
- 핵심개념 카드와 개인 개념 그래프
- Today Plan과 복습 큐, max three primary tasks
- GIII 실무 루틴, relevant practice calculation only

## 10.3 `second_os_pro`

정가 가설: **월 119,000~149,000원**

- `second_os_basic` 전체 기능
- 더 높은 Evidence Review capacity
- weekly weakness report
- 상세 rubric point ledger
- 재작성 즉시 재검토
- 실무 계산 trace·검산 상세
- 전과목 시간제한 모의세트
- 반복 약점 심층 분석
- 다중 답안 버전 비교
- 고급 내보내기

## 10.4 `second_control_premium`

정가 가설: **월 249,000~299,000원**

- `second_os_pro` 전체 기능
- 합격관제 리포트
- 고비용 Deep Review Unit 접근
- 시험일까지 약점 map, Review Queue, Today Plan 운영 보고
- 실무 GIII routine recovery 집중
- 우선 처리 큐, provider-cost guardrail 범위 안에서만 제공

## 10.5 Deep Review one-off SKUs

Deep Review Unit definition:

```text
1 unit = one 25~50 point sub-question or up to 5 answer pages
2 units = one 100-minute full answer
```

One-off SKU hypotheses:

- `deep_review_5`: 49,000 KRW
- `deep_review_15`: 129,000 KRW
- `deep_review_40`: 299,000 KRW

규칙:

- Units must be consumed only through a future usage ledger.
- Failed generation must not consume units.
- Expensive provider work should reserve first and commit only after a usable result in a later implementation PR.
- This document records policy only; no ledger behavior is implemented here.

## 10.6 Optional or later-only SKUs

- `managed_cohort`: 690,000~990,000 KRW / 8 weeks, later only and disabled until real operators/reviewers and capacity limits exist.
- `season_pass`: later only and disabled.

Founding/beta prices may be lower but must not replace the final target taxonomy.

## 10.7 제외 상품

다음 소비자 상품은 만들지 않는다.

- unlimited second-exam precision review
- 전문가 1:1 검수 판매
- 답안당 전문가 첨삭 중개
- 합격 보장 패키지
- 사람 검수처럼 위장한 AI 결과

전문가 검수는 제품 품질을 위한 내부 spot check로만 사용할 수 있으며 사용자에게 별도 상품으로 판매하지 않는다.

---

## 11. 학원용 답안 운영 콘솔

학원 콘솔은 learner app과 분리된 B2B 제품이다.

### 11.1 핵심 기능

- 학원·강사 tenant 분리
- 학생 roster와 반 관리
- 과제·기출·모의고사 배포
- 답안 일괄 업로드
- AI 연습채점·첨삭 초안
- 강사 rubric template
- 강사 수정·승인·배포
- 학생별 반복 약점과 개념 heatmap
- 반 전체 취약 논점
- 재작성 제출 관리
- CSV/PDF export
- 사용량·비용 관리
- 답안 보존기간·삭제 정책

학원이 학생에게 점수를 확정해 제공하는 경우, 최종 승인은 학원 사용자의 책임이다. Inverge는 학원에 전문가 인력을 제공하지 않는다.

### 11.2 B2B 가격 가설

#### Academy Team

**월 1,490,000원**

- 운영자 5명
- 활성 수강생 100명
- 월 1,500 review credits
- 기본 rubric·과제·분석·export

#### Academy Pro

**월 3,900,000원**

- 운영자 20명
- 활성 수강생 300명
- 월 5,000 review credits
- custom rubric
- 강사별 workflow
- cohort analytics
- 우선 지원

#### Enterprise

**월 7,000,000원부터 협의**

- SSO
- 전용 tenant 정책
- custom retention
- 대량 ingest
- SLA
- 전용 usage pool

초기 계약은 정가표보다 pilot fee + 사용량 방식으로 검증할 수 있다. 그러나 저가 SaaS로 포지셔닝하지 않는다. 학원 콘솔은 첨삭 운영시간과 관리비를 절감하는 B2B 인프라다.

---

## 12. 데이터·개인정보·저작권 원칙

### 12.1 데이터 분리

- 공식 기출·법령·기준자료: product reference data
- 사용자가 올린 답안·OCR·재작성: user-owned service data
- 오류 태그·개념 상태: derived learning data
- 학원 학생 답안: tenant-scoped service data

서로 다른 경계를 합치지 않는다.

### 12.2 사용자 답안

- 명시적 동의 없이 모델 학습에 사용하지 않는다.
- 삭제·내보내기 기능을 제공한다.
- raw OCR·답안은 필요한 보존기간만 저장한다.
- 로그·telemetry에는 raw 답안을 넣지 않는다.
- 학원 답안은 학원 tenant 밖으로 공유하지 않는다.

### 12.3 기출과 제3자 콘텐츠

- 공식 source와 권리 상태를 저장한다.
- 제3자 학원 답안·교재·해설은 허가 없이 ingest하지 않는다.
- 생성 기준답안은 제3자 답안을 복제하지 않는다.
- source 인용은 필요한 범위만 사용한다.
- 권리 불확실 자료는 learner UI 노출을 fail-closed 처리한다.

---

## 13. 품질 게이트

## 13.1 공통

- 모든 세부 물음 인식률 99% 이상
- OCR 수정 없이 진행한 저신뢰 구간 0건
- 존재하지 않는 source 인용 0건
- 공식 답안·공식 채점 오인 문구 0건
- 결과마다 다음 재작성 행동 존재
- 모든 감점 후보에 사용자 답안 evidence 존재
- 저장·재작성·오답노트 연결 성공률 99% 이상

## 13.2 법규

- 시험일 기준 법령 버전 오류 0건
- 허위 조문·판례 인용 0건
- 핵심 쟁점 탐지 benchmark 일치율 85% 이상
- 포섭 부족 탐지 precision 85% 이상

## 13.3 이론

- 핵심 개념·정의 benchmark 일치율 90% 이상
- 문제 요구 이탈 탐지 precision 85% 이상
- 중복·장황함 개선 평가 통과율 85% 이상

## 13.4 실무

- 지원 유형 계산 정답률 98% 이상
- 단위·반올림 오류 탐지율 98% 이상
- 계산 검증 불일치 답안 공개 0건
- 표 OCR 저신뢰 자동 진행 0건
- 지원하지 않는 유형에서 확정 답안 생성 0건

## 13.5 기준답안

- critic blocker 0건
- rubric과 기준답안 불일치 0건
- source anchor 없는 핵심 주장 0건
- 후보 간 unresolved conflict가 있으면 사용자 표시 또는 공개 차단
- 각 답안의 release status와 검증 상태 표시

## 13.6 제품

- 무료 1회 첨삭 완료율 70% 이상
- 결과 후 재작성 시작률 60% 이상
- 재작성 완료율 45% 이상
- 14일 내 두 번째 답안 제출률 35% 이상
- `second_os_basic` / `second_os_pro` / `second_control_premium` 유료 전환율과 해지 사유 기록
- 반복 오류율이 4주 기준 감소하는지 측정

---

## 14. Agent Factory 실행 로드맵

AI 공장은 `roadmap/active-program.yml`의 의존성과 WIP 제한을 따른다.

### Phase A — 헌법과 source registry

- S200 Product Constitution & Final Spec
- S201 Official Syllabus / Exam Rule Registry
- S202 Historical Question Source & Rights Registry
- S200R Dabangil Premium Second-Round Control OS Alignment
- S203 Canonical Question Schema & Ingestion

### Phase B — 공통 답안 커널

- S204 Answer Submission / OCR Confirmation
- S205 Common Rubric / Evidence / Score Range Contract
- S206 Rewrite / Regrade / History
- S207 Reference Answer Package Schema

### Phase C — 과목별 grounding과 validator

- S208 Law Source Corpus & Version Validator
- S209 Theory Concept Corpus & Validator
- S210 Practice Calculation / Unit / OCR Validator

### Phase D — 세 과목 엔진

- S211 Law Answer Engine
- S212 Theory Answer Engine
- S213 Practice Answer Engine

### Phase E — 기준답안과 개인화

- S214 Multi-candidate Reference Answer Pipeline
- S215 Critic / Consensus / Release Gate
- S216 Automatic Error Notebook
- S217 Personal Core Concept Graph
- S218 Similar Past Question / Review Scheduler

### Phase F — 상용화

- S219 Dabangil Learner Catalog / Future Usage Ledger
- S220 Billing / Entitlement / Credit Packs
- S221 Privacy / Export / Delete / Cost Guardrails
- S222 Academy Console
- S223 Three-subject Corpus & Quality Acceptance
- S224 Three-subject Learner E2E Acceptance
- S225 Public Paid Launch Acceptance

### 14.1 WIP 정책

WIP limit은 2다.

- 한 슬롯: product/domain work
- 한 슬롯: infrastructure/quality/commercial work

동일 lock group의 동시 변경은 금지한다.

### 14.2 자동 진행 금지 조건

다음은 human decision으로 전환한다.

- 기출 재배포 권리 불명확
- 공식 source 해석 충돌
- 요금제·환불 정책 변경
- 개인정보 보존기간 변경
- 새로운 AI provider 또는 결제 provider
- 실무 계산 검증 기준 완화
- 공개 출시 게이트 우회

### 14.3 완료의 정의

문서·코드·테스트만으로 완료 처리하지 않는다.

- 구현 완료
- unit/integration/e2e 통과
- 품질 eval 통과
- 권리·source 상태 확인
- 실제 runtime evidence
- 비용 상한 검증
- 모바일 사용자 흐름 검증
- 남은 위험 기록

---

## 15. 기능 범위 표

| 기능 | free | second_os_basic | second_os_pro | second_control_premium | Academy |
|---|---:|---:|---:|---:|---:|
| 전과목 source/rights metadata 기반 탐색 | 제한 | 포함 | 포함 | 포함 | 계약 범위 |
| Evidence Review | 평생 1회 | 포함 | 높은 capacity | premium control | 초안 |
| 가장 큰 간극 1개 | 1회 | 포함 | 포함 | 포함 | 초안·수정 |
| 다음 행동 1개 | 1회 | 포함 | 포함 | 포함 | 초안·수정 |
| 검증형 학습 기준답안 | 1회 | 포함 | 포함 | 포함 | 포함 |
| 재작성·재검토 | 1회 | 포함 | 상세 | premium control | 과제 관리 |
| 다시 계산 | 1회 | 포함 | 상세 | premium control | 과제 관리 |
| GIII 실무 루틴 | 1회 | 기본 | 상세 | 집중 | 상세 |
| 자동 오답노트 | 1회 체험 | 포함 | 포함 | 포함 | 학생별 |
| 핵심개념 그래프 | 제한 | 포함 | 심층 | 심층 | 학생·반 |
| weekly weakness report | 없음 | 없음 | 포함 | 포함 | 반 단위 |
| Deep Review Unit | 없음 | 별도 SKU | 별도 SKU | 포함/별도 SKU | 계약 범위 |
| 전문가 검수 서비스 | 없음 | 없음 | 없음 | 없음 | 학원 자체 승인 |

---

## 16. 명시적 비범위

공개 출시 v1에서 제외한다.

- 감정평가사 1차 신규 기능
- 다른 전문자격시험
- 라이브 강의
- 전문가 첨삭 중개
- 사람 채점자 marketplace
- 합격 확률
- 공식 점수 확정
- 제3자 교재·답안 무단 수집
- 답안을 쓰지 않고 기준답안만 수집하게 만드는 콘텐츠 소비형 UX
- 순위·공포·수치심 기반 동기부여

---

## 17. 최종 제품 한 문장

> 답안길 2차 합격관제 OS는 감평 2차 실무·이론·법규 답안을 시험일까지 Evidence Review, GIII 실무 루틴, 재작성·다시 계산, 자동 오답노트, 핵심개념 추적, Review Queue, Today Plan으로 운영해주는 premium second-exam answer operating system이다.
