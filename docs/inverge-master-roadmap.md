# Inverge Master Roadmap — 감정평가사 2차 전과목

- 결정일: 2026-06-25
- 상세 제품 기준: `docs/inverge-second-round-final-product-spec.md`
- 실행 상태와 의존성 기준: `roadmap/active-program.yml`

## 1. Final Product Definition

Inverge는 감정평가사 2차의 감정평가실무, 감정평가이론, 감정평가 및 보상법규를 모두 지원하는 **전과목 답안 완성 OS**다.

공개 유료 출시에는 아래가 모두 필요하다.

- 세 과목 엔진
- 공식 기출 source/rights registry
- 검증형 기준답안
- 연습채점·정밀첨삭
- 재작성·재채점
- 자동 오답노트
- 핵심개념 그래프
- 결제·개인정보·비용 통제
- 세 과목 통합 E2E

감정평가사 1차는 신규 개발·노출·유료 범위에서 동결한다.

## 2. Public Launch Rule

내부적으로 법규, 이론, 실무를 순차 개발해도 공개 판매는 전과목이 모두 완료된 뒤 시작한다.

금지:

- 법규만 완성한 상태의 공개 유료 출시
- 일부 과목을 전과목 제품처럼 판매
- 품질 게이트 우회
- 공식 답안이 없는 문제에 검증되지 않은 답안을 확정적으로 노출

허용:

- 과목별 내부 알파
- 제한된 초대 베타
- synthetic 또는 권리 확인된 문제를 이용한 품질평가
- 학습용 기준답안임을 명시한 제한 검증

## 3. Core Learner Loop

```text
기출 선택
→ 답안 작성·촬영
→ OCR 확인
→ 연습채점·정밀첨삭
→ 가장 큰 간극
→ 검증형 기준답안
→ 답안 비교
→ 재작성·재채점
→ 오답노트·개념 그래프
→ 다음 복습·유사 기출
```

## 4. Phase A — Product Constitution and Official Registry

### S200 Product Constitution & Final Spec

- 제품 범위 2차 전과목 고정
- 1차 동결
- 가격·학원 콘솔·답안 정책 확정
- 공장 source of truth 정렬

### S201 Official Syllabus & Exam Rule Registry

- 공식 과목명·시험 규칙·배점·답안지 규칙
- 시행 연도별 변경 이력
- 공식 source와 검증일

### S202 Historical Question Source & Rights Registry

- 모든 공식 기출 source 목록
- 원본 URL·hash·연도·회차
- rights status와 display mode
- 누락 연도·차단 연도 보고

### S203 Canonical Question Schema & Ingestion

- 문항·세부 물음·배점 분리
- 표·수식·이미지 상태
- 시험일·법령 기준일
- topic/concept tags
- idempotent ingestion

## 5. Phase B — Common Answer Kernel

### S204 Answer Submission & OCR Confirmation

- image/PDF/text
- multi-page mobile capture
- OCR confidence
- user correction
- durable save and recovery

### S205 Rubric, Evidence and Practice Score Range

- 공통 rubric row contract
- learner-answer evidence
- score range and confidence
- duplicate deduction control
- insufficient-evidence withholding

### S206 Rewrite, Regrade and History

- before/after answer versions
- same-rubric regrade
- improvement delta
- history and scheduled retry

### S207 Reference Answer Package Schema

- requirement map
- issue map
- scoring blueprint
- Skeleton
- exam-time full answer
- expanded study answer
- alternatives
- source anchors
- validation state

## 6. Phase C — Subject Grounding and Validators

### S208 Law Source Corpus & Version Validator

- 시험일 기준 법령
- 시행령·시행규칙
- 판례와 공개 행정자료
- source anchors
- legal claim fail-closed

### S209 Theory Concept Corpus & Validator

- 정의와 개념 그래프
- 공식 기준과 공개 전문자료
- 개념 간 관계
- 대안 견해와 불확실성

### S210 Practice Calculation & OCR Validator

- deterministic calculators
- unit/dimension checks
- independent recalculation
- reverse checks
- table OCR confidence
- supported-type registry

## 7. Phase D — Three Subject Engines

### S211 Law Answer Engine

- issue spotting
- legal rule
- requirement decomposition
- subsumption
- conclusion
- legal-source verification

### S212 Theory Answer Engine

- definition
- theory basis
- comparison frame
- application/evaluation
- conclusion
- compression and relevance

### S213 Practice Answer Engine

- assumptions
- data selection
- formula
- calculation trace
- unit/rounding/time adjustment
- cross-check
- conclusion writing

세 엔진은 공통 answer kernel을 사용하되 과목별 rubric과 validator를 분리한다.

## 8. Phase E — Generated Reference Answers

### S214 Multi-candidate Reference Answer Pipeline

- problem requirement decomposition
- source pack
- minimum three independent candidates
- subject-specific candidate strategies

### S215 Critic, Consensus and Release Gate

- missing requirement detection
- fabricated-source detection
- calculation conflict detection
- rubric-answer consistency
- unresolved conflict state
- released/blocked status

사용자에게는 `Inverge 검증형 기준답안`으로 제공한다. 공식 모범답안이라고 표현하지 않는다.

## 9. Phase F — Automatic Learning Memory

### S216 Automatic Error Notebook

- gap taxonomy
- answer evidence
- why wrong
- correct principle
- immediate fix
- recurrence and recovery

### S217 Personal Core Concept Graph

- exposure/error/recurrence
- successful rewrite
- delayed recall
- mastery and forgetting risk
- exam impact

### S218 Similar Question and Review Scheduler

- related historical questions
- concept transfer
- rewrite due
- spaced review
- Today Plan max three tasks

## 10. Phase G — Commercial System

### S219 Catalog and Usage Ledger

- Free one review
- Core 30 reviews
- Intensive 80 reviews
- extra credit packs
- academy products
- price versions

### S220 Billing and Entitlement

- server-side entitlement
- subscription state
- credit debit after usable result
- duplicate-charge prevention
- cancellation/refund state

### S221 Trust, Privacy and Cost Guardrails

- export/delete
- retention
- support and policy copy
- AI cost caps
- error monitoring
- source/rights and verification display

## 11. Phase H — Academy Console

### S222 Academy Answer Operations Console

- tenant and role boundary
- roster and cohort
- assignment distribution
- batch answer intake
- AI grading/feedback drafts
- instructor edit/approval
- weakness analytics
- rewrite management
- export and usage controls

Inverge는 전문가 첨삭 인력을 판매하지 않는다. 학원 사용자가 자체 workflow에서 최종 승인한다.

## 12. Phase I — Integrated Acceptance

### S223 Three-Subject Corpus & Quality Acceptance

- historical-question coverage
- rights status completeness
- law quality eval
- theory quality eval
- practice calculation eval
- reference-answer release audit

### S224 Three-Subject Learner E2E Acceptance

- free review
- paid entitlement
- all three subjects
- answer upload
- grading/feedback
- reference answer
- rewrite/regrade
- error note/concept graph
- refresh and cross-session durability
- mobile widths

### S225 Public Paid Launch Acceptance

- all dependencies complete
- production configuration
- billing and privacy gates
- support readiness
- cost evidence
- rollback plan
- public landing and pricing alignment

## 13. Pricing Direction

- Free: 평생 full review 1회
- Core: 월 79,000원, 월 30회 가설
- Intensive: 월 149,000원, 월 80회 가설
- Academy Team: 월 1,490,000원 가설
- Academy Pro: 월 3,900,000원 가설
- Enterprise: 월 7,000,000원부터 가설

Founding beta 할인은 상세 제품 명세를 따른다.

## 14. Quality Gates

### Common

- 모든 감점에 learner-answer evidence
- 모든 결과에 next rewrite/review action
- fabricated source 0
- official-answer/grading claim 0
- OCR low-confidence bypass 0

### Law

- law-version error 0
- fabricated statute/case 0
- issue benchmark target 충족

### Theory

- definition/concept benchmark target 충족
- relevance and structure benchmark target 충족

### Practice

- supported-type calculation accuracy 98% 이상
- unit/rounding detection 98% 이상
- calculation conflict release 0

### Product

- free review completion
- rewrite conversion
- repeat submission
- repeated-gap reduction
- paid conversion and retention

## 15. WIP and Human Decisions

WIP limit은 2다.

human decision이 필요한 항목:

- 제품 범위·가격·학습자 약속 변경
- 기출 재배포 권리 해석
- 결제·환불·개인정보·보존 정책
- 새 provider
- 계산 허용오차 완화
- 세 과목 공개 출시 게이트 우회

## 16. Definition of Done

완료는 다음을 모두 포함한다.

- implementation
- tests/build
- domain quality eval
- source/rights status
- runtime evidence
- cost evidence
- mobile E2E
- rollout/rollback
- remaining risks

## 17. Foundational Operating-Loop Compatibility

The internal learning engine keeps the established vocabulary as a compatibility layer:

1. **Input**: 기출, 문제, 답안, OCR 확인본, 재작성 결과를 받는다.
2. **Diagnosis**: 가장 큰 간극, 감점 근거, 오류 유형을 찾는다.
3. **Tracking**: 오답노트와 개인 핵심개념 상태를 누적한다.
4. **Prediction**: 반복 오류, 망각 위험, 시험 영향도를 추정한다.
5. **Recommendation**: 다음 재작성, 복습 또는 유사 기출을 고른다.
6. **Execution**: 사용자가 실제 답안·문단·계산을 다시 수행한다.
7. **Retry/rewrite**: 재채점과 지연 복습으로 루프를 닫는다.

Canonical compatibility string:

`input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite`

이 호환 계층은 감정평가사 1차 신규 개발을 다시 활성화하지 않는다. 감정평가사 1차는 동결 상태이며, 활성 learner product는 감정평가사 2차 전과목이다.
