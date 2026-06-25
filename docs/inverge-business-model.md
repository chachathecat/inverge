# Inverge Business Model — 감정평가사 2차 전과목

- 결정일: 2026-06-25
- 상세 기준: `docs/inverge-second-round-final-product-spec.md`

## 1. Principle

Inverge는 감정평가사 2차 전과목의 기출 풀이, 연습채점, 정밀첨삭, 검증형 기준답안, 재작성, 자동 오답노트와 핵심개념 추적을 판매한다.

- 결제 전에 한 번의 완전한 가치를 경험하게 한다.
- 무료 결과를 의도적으로 저품질로 만들지 않는다.
- 불안, 실수, 합격 공포를 과금 장치로 사용하지 않는다.
- 점수만 보여주고 다음 행동을 잠그지 않는다.
- 무제한 요금제는 제공하지 않는다.
- 합격 보장, 공식 채점, 공식 모범답안으로 판매하지 않는다.
- 전문가 1:1 검수 또는 첨삭 중개는 판매하지 않는다.

## 2. Free

가격: 무료

계정당 평생 full answer review 1회 제공한다.

포함:

- 세 과목 중 하나 선택
- OCR 확인
- 예상 점수 범위
- 정밀첨삭
- 검증형 기준답안 전체
- 답안 비교
- 재작성·재채점 1회
- 오답노트와 핵심개념 카드

무료 사용자는 제품의 전체 핵심가치를 한 번 경험해야 한다.

## 3. Core

정가 가설: **월 79,000원**

- 월 30 full answer review credits
- 법규·이론·실무 전과목
- 전체 기출 탐색
- 제출 후 검증형 기준답안 전체
- 예상 점수 범위
- 정밀첨삭
- 문단·계산 재작성
- 자동 오답노트
- 핵심개념 카드와 개인 개념 그래프
- 유사 기출 추천
- Today Plan과 복습 큐
- 기본 내보내기

## 4. Intensive

정가 가설: **월 149,000원**

- 월 80 full answer review credits
- Core 전체 기능
- 상세 rubric point ledger
- 재작성 즉시 재채점
- 실무 계산 trace와 검산 상세
- 전과목 시간제한 모의세트
- 최종월 압축 계획
- 반복 약점 심층 분석
- 여러 답안 버전 비교
- 고급 내보내기
- 우선 처리 큐

## 5. 추가 크레딧

- Core 추가 10회: 29,000원
- Intensive 추가 10회: 19,000원

한 review credit은 허용된 파일·페이지 한도 내 한 문항과 한 답안 분석이다. 한도를 넘는 입력은 분할하거나 추가 credit을 사용한다.

## 6. Founding Paid Beta

품질과 가격 탄력성을 검증하기 위한 제한 가격:

- Core founding: 월 59,000원
- Intensive founding: 월 109,000원
- 최초 결제자 가격 유지: 최대 12개월 가설

일부 과목만 완성된 상태에서는 내부·초대 베타만 허용한다. 세 과목 통합 품질 게이트를 통과한 뒤에만 유료 베타를 연다.

## 7. Academy Answer Operations Console

학원 콘솔은 learner app과 분리된 B2B 제품이다.

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

Inverge는 학원에 사람 첨삭자를 공급하지 않는다. 학원이 학생에게 최종 점수를 배포하는 경우 학원 사용자가 검토·승인한다.

## 8. Commercial Domains

상용화 구현은 다음을 분리한다.

- product catalog and price version
- subscription and entitlement
- usage ledger
- credit grant and debit
- refund and cancellation state
- invoice reference
- cost guardrail state
- academy tenant quota

가격을 UI 문자열만으로 구현하지 않는다.

## 9. Usage and Cost Rules

- 모든 AI 분석은 서버 측 entitlement를 확인한다.
- 사용량 차감은 사용 가능한 결과가 생성된 뒤 확정한다.
- 오류·파싱 실패·저장 실패는 중복 차감을 방지한다.
- OCR, answer review, reference answer, practice verification 비용을 구분한다.
- 일·월 비용 상한과 계정별 요청 제한을 둔다.
- 공개 무제한 generation endpoint를 만들지 않는다.

## 10. Paid Launch Hard Gates

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
- academy tenant boundary

## 11. Metrics

- free full-review completion rate
- result-to-rewrite conversion
- rewrite completion
- 14-day second-answer submission
- repeated-gap reduction
- delayed recall improvement
- Core conversion
- Intensive upgrade
- monthly retention
- credit utilization
- average AI cost per successful review
- support issues per 100 reviews
- academy operator time saved

## 12. What Must Not Be Monetized Separately

- 데이터 경계 설명
- OCR 불확실성 확인
- 삭제·내보내기
- 사용량 확인
- 오류 재시도
- 동일 요청 실패 복구
- source와 verification 상태
- 기본 재작성 행동
- 추천 이유 설명

## 13. Validation Rule

이 문서의 가격은 구현과 시장 검증을 위한 가설이다. 실제 정가는 결제 전환, 해지율, 사용량, AI 원가, 첨삭 유용성, 반복 학습 성과, 학원 pilot 운영시간 절감으로 조정한다.

가격 검증을 이유로 제품 범위나 품질 게이트를 낮추지 않는다.
