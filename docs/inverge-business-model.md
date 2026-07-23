# Inverge / 답안길 Business Model — 감정평가사 2차 Premium OS

- 결정일: 2026-06-25
- S200R 정렬일: 2026-06-26
- 상세 기준: `docs/inverge-second-round-final-product-spec.md`
- Premium OS brief: `docs/dabangil-second-exam-premium-os.md`
- Post-#650 commercial authority:
  `docs/dabangil-unified-program-contract.md`

## 1. Principle

Inverge는 내부 codename 및 repository name이다. Learner-facing brand는 **답안길**이고, premium product는 **답안길 2차 합격관제 OS**다.

답안길은 감정평가사 2차 실무·이론·법규 답안을 시험일까지 Evidence Review, 재작성, 다시 계산, GIII 실무 루틴, 오답노트, 핵심개념 추적, Review Queue, Today Plan으로 운영하는 premium second-exam answer operating system을 판매한다.

- 결제 전에 한 번의 완전한 가치를 경험하게 한다.
- 무료 결과를 의도적으로 저품질로 만들지 않는다.
- 불안, 실수, 합격 공포를 과금 장치로 사용하지 않는다.
- 점수만 보여주고 다음 행동을 잠그지 않는다.
- no unlimited second-exam precision review.
- 합격 보장, 공식 채점, 공식 모범답안으로 판매하지 않는다.
- 전문가 1:1 검수 또는 첨삭 중개는 B2C 상품으로 판매하지 않는다.
- 가격은 configurable, versioned catalog로 관리하고 UI/API literal로 흩어 hard-code하지 않는다.

## 1.1 Invitation-Only Founding Beta Hypothesis

Owner O1 approved this hypothesis for later evidence gathering only:

- 69,000 KRW VAT included;
- 30 days with no automatic renewal;
- 20 `usable_review_unit_v1`;
- invitation-only private Founding Beta before S225 public self-serve;
- one lifetime full-value free review per account;
- no payment-first flow and no deliberately degraded free output.

This is not an active price, checkout, entitlement, billing grant, learner
offer, or Production activation. O4 remains required.

`ReviewUnit`, `usable_review_unit_v1`, and legacy `deep_review_unit` are three
separate contracts with no alias, balance sharing, conversion, migration, or
fallback. The first is non-billable learning scheduling; the second is the
Founding Beta hypothesis meter; the third is the S219/S220 premium meter.

For `usable_review_unit_v1`, 10–25 points hypothesizes 1 unit, 40–50 points
2, and 100 points 4. Missing points and 26–39 or 51–99 require an explicit
pre-submit estimate/manual decision. The committed amount cannot increase
after the result.

## 2. Final Target Learner Catalog

These rows are taxonomy and pricing hypotheses only; none is a current offer,
entitlement, billing state, or learner activation. O4 and the applicable
private/public acceptance gates remain required.

| Catalog ID | Pricing hypothesis | Status | Product role |
|---|---:|---|---|
| `free` | 0 KRW | target taxonomy only — inactive until O4/S225 | One lifetime full-value review experience. |
| `second_os_basic` | 59,000~69,000 KRW/month | target taxonomy only — inactive until O4/S225 | Primary operating loop for Evidence Review, rewrite/recalculation, and review queue. |
| `second_os_pro` | 119,000~149,000 KRW/month | target taxonomy only — inactive until O4/S225 | Higher review capacity, weekly weakness report, deeper evidence review, version comparison. |
| `second_control_premium` | 249,000~299,000 KRW/month | target taxonomy only — inactive until O4/S225 | Premium control layer, Deep Review Unit access, stronger operations reporting. |

Legacy labels `Core` and `Intensive` are not the final target taxonomy. They may appear only in historical or migration notes until later runtime catalog work removes old literals.

## 3. `free`

가격: 0 KRW

계정당 평생 full-value review 1회 제공한다.

포함:

- 세 과목 중 하나 선택
- OCR 확인
- Evidence Review / 답안 검토 리포트
- 연습점수 범위와 신뢰도
- 가장 큰 간극 1개
- 다음 행동 1개
- 검증형 학습 기준답안
- 답안 비교
- 재작성 또는 다시 계산 1회
- 오답노트와 핵심개념 카드
- GIII 실무 루틴, relevant practice calculation only

무료 사용자는 제품의 전체 핵심가치를 한 번 경험해야 한다.

## 4. `second_os_basic`

정가 가설: **월 59,000~69,000원**

- 법규·이론·실무 전과목
- source/rights metadata 기반 기출 운영
- Evidence Review / 답안 검토 리포트
- 가장 큰 간극 1개와 다음 행동 1개
- 연습점수 범위와 confidence, secondary only
- 재작성 또는 다시 계산
- 자동 오답노트
- 핵심개념 카드와 개인 개념 그래프
- Today Plan과 복습 큐, max three primary tasks
- GIII 실무 루틴, relevant practice calculation only

## 5. `second_os_pro`

정가 가설: **월 119,000~149,000원**

- `second_os_basic` 전체 기능
- 더 높은 Evidence Review capacity
- weekly weakness report
- 상세 rubric point ledger
- 재작성 즉시 재검토
- 실무 계산 trace와 검산 상세
- 전과목 시간제한 모의세트
- 반복 약점 심층 분석
- 여러 답안 버전 비교
- 고급 내보내기

## 6. `second_control_premium`

정가 가설: **월 249,000~299,000원**

- `second_os_pro` 전체 기능
- 합격관제 리포트
- 고비용 Deep Review Unit 접근
- 시험일까지 약점 map, Review Queue, Today Plan 운영 보고
- GIII routine recovery 집중
- 우선 처리 큐, provider-cost guardrail 범위 안에서만 제공

The term `합격관제` means study-operation support. It must not imply pass guarantee, official score, or pass probability.

## 7. Deep Review One-Off SKUs

Deep Review Unit definition:

```text
1 unit = one 25~50 point sub-question or up to 5 answer pages
2 units = one 100-minute full answer
```

| SKU | Pricing hypothesis | Included units |
|---|---:|---:|
| `deep_review_5` | 49,000 KRW | 5 |
| `deep_review_15` | 129,000 KRW | 15 |
| `deep_review_40` | 299,000 KRW | 40 |

Rules:

- Units must be consumed only through a future usage ledger.
- Failed generation must not consume units.
- Expensive provider work should reserve first and commit only after a usable result in later implementation PRs.
- This document records policy only and does not implement ledger behavior.

## 8. Optional Or Later-Only Catalog

| Catalog ID | Pricing hypothesis | Status |
|---|---:|---|
| `managed_cohort` | 690,000~990,000 KRW / 8 weeks | later-only disabled until real operators/reviewers and capacity limits exist. |
| `season_pass` | not priced | later-only disabled. |

Founding/beta prices may be lower but must not replace the final target taxonomy.

## 9. Academy Answer Operations Console

학원 콘솔은 learner app과 분리된 B2B 제품이다.
이 절은 historical target/catalog 가설이며 현재 Academy UI/API/DB/RLS,
runtime, price를 활성화하지 않는다. Named partner, one-tenant packet,
권리·DPA/privacy 조건, instructor approval, exact-scope O4C가 모두
충족되어야 별도 pilot lane을 시작할 수 있고 S225와는 독립이다.

### Academy Team

정가 가설: **월 1,490,000원**

- 운영자 5명
- 활성 수강생 100명
- 월 1,500 review credits
- 과제·기출 배포
- 답안 일괄 수집
- AI 채점·첨삭 초안
- 강사 수정·승인
- 학생·반 약점 분석
- 재작성 관리
- 기본 내보내기

### Academy Pro

정가 가설: **월 3,900,000원**

- 운영자 20명
- 활성 수강생 300명
- 월 5,000 review credits
- custom rubric
- 강사별 workflow
- cohort analytics
- 고급 내보내기
- 우선 지원

### Enterprise

정가 가설: **월 7,000,000원부터 협의**

- SSO
- 전용 tenant 정책
- custom retention
- 대량 ingest
- SLA
- 전용 usage pool

답안길은 학원에 사람 첨삭자를 공급하지 않는다. 학원이 학생에게 최종 점수를 배포하는 경우 학원 사용자가 검토·승인한다.

## 10. Commercial Domains

상용화 구현은 다음을 분리한다.

- product catalog and price version
- subscription and entitlement
- future usage ledger
- Deep Review Unit reserve and commit
- refund and cancellation state
- invoice reference
- cost guardrail state
- academy tenant quota

가격을 UI 문자열만으로 구현하지 않는다.

## 11. Usage And Cost Rules

- 모든 AI 분석은 서버 측 entitlement를 확인한다.
- 사용량 차감은 사용 가능한 결과가 생성된 뒤 확정한다.
- 오류·파싱 실패·저장 실패는 중복 차감을 방지한다.
- OCR, answer review, reference answer, practice verification 비용을 구분한다.
- 일·월 비용 상한과 계정별 요청 제한을 둔다.
- 공개 무제한 generation endpoint를 만들지 않는다.

## 12. Paid Launch Hard Gates

아래가 모두 완료되기 전 결제를 활성화하지 않는다.

- 세 과목 엔진 완료
- 전체 기출 source와 rights 상태 확인
- 기준답안 품질 게이트
- 첨삭 품질 게이트
- 오답노트와 개념 그래프
- auth/session
- durable storage
- billing and entitlement
- usage ledger
- refund/cancellation copy
- privacy export/delete
- support contact
- error monitoring
- AI cost guardrails
- staging and mobile E2E

Academy is not an S225 public self-serve dependency.

### Academy Pilot-Only Gates

The separate named-partner Academy lane requires its own tenant boundary,
one-tenant packet, rights and DPA/privacy conditions, explicit instructor
approval, and exact-scope O4C before pilot activation. Those gates do not
delay or authorize S225.

## 13. Metrics

- free full-review completion rate
- result-to-rewrite conversion
- recalculation completion
- 14-day second-answer submission
- repeated-gap reduction
- delayed recall improvement
- `second_os_basic` conversion
- `second_os_pro` upgrade
- `second_control_premium` conversion
- Deep Review Unit utilization
- monthly retention
- average AI cost per successful review
- support issues per 100 reviews
- academy operator time saved

## 14. What Must Not Be Monetized Separately

- 데이터 경계 설명
- OCR 불확실성 확인
- 삭제·내보내기
- 사용량 확인
- 오류 재시도
- 동일 요청 실패 복구
- source와 verification 상태
- 기본 재작성 행동
- 추천 이유 설명

## 15. Validation Rule

이 문서의 가격은 구현과 시장 검증을 위한 가설이다. 실제 정가는 결제 전환, 해지율, 사용량, AI 원가, Evidence Review 유용성, 반복 학습 성과, 학원 pilot 운영시간 절감으로 조정한다.

가격 검증을 이유로 제품 범위나 품질 게이트를 낮추지 않는다.

## 2026-07-01 Product Constitution Transition

Commercial execution remains deferred in this PR. This document records product and catalog policy only; it does not add a payment provider, checkout, billing enforcement, entitlement enforcement, usage ledger, subscriptions, invoices, provider settings, or runtime pricing behavior.

The target learner catalog taxonomy source of truth (not active offers) is:

- `free`
- `second_os_basic`
- `second_os_pro`
- `second_control_premium`
- `deep_review_5`
- `deep_review_15`
- `deep_review_40`

No item in the list above is activated by this policy.
First-round OS, 동차 OS, generic multi-exam OS, and Quick packs are not active learner-facing catalog items in this repository. If legacy or exploratory labels exist in older documents, they are frozen or deferred and must not replace the second-round Dabangil taxonomy. Any future commercial expansion requires explicit source, billing, refund, privacy, retention, cost, entitlement, data-boundary, and runtime gates.
