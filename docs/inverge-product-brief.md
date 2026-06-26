# Inverge / 답안길 Product Brief — 감정평가사 2차 Premium OS

- 결정일: 2026-06-25
- S200R 정렬일: 2026-06-26
- 상세 Source of Truth: `docs/inverge-second-round-final-product-spec.md`
- Premium OS brief: `docs/dabangil-second-exam-premium-os.md`

## 1. Core Definition

Inverge는 내부 codename 및 repository name이다.

Learner-facing brand는 **답안길**이다.

Premium product는 **답안길 2차 합격관제 OS**다.

사용자에게 보이는 핵심 포지셔닝:

> 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS

지원 범위:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

감정평가사 1차는 신규 개발·노출·유료 범위에서 동결한다.

세 과목을 내부적으로 순차 개발할 수 있으나, 세 과목 전체와 통합 품질 게이트가 완료되기 전에는 공개 유료 출시하지 않는다.

## 2. Primary Job

사용자가 모든 공식 기출을 풀고 다음 루프를 반복하도록 만든다.

```text
기출 선택
→ 답안 작성·촬영
→ OCR 확인
→ Evidence Review / 답안 검토 리포트
→ 가장 큰 간극 확인
→ 다음 행동 1개
→ 검증형 학습 기준답안 보기
→ 답안 비교
→ 재작성·다시 계산
→ 자동 오답노트·핵심개념 추적
→ 다음 복습·유사 기출
```

점수 표시만으로 끝내지 않는다. 모든 결과는 재작성, 재채점 또는 복습으로 연결한다.

## 3. Learner Promise

답안길은 다음을 제공한다.

- 세 과목 source/rights metadata 기반 기출 운영
- 사진·PDF·텍스트 답안 입력
- OCR 확인·수정
- Evidence Review / 답안 검토 리포트
- 가장 큰 간극 1개
- 다음 행동 1개
- 예상 점수 범위와 신뢰도
- 루브릭별 감점 근거
- 누락 논점·약한 문단·계산 오류
- GIII 실무 루틴
- 시험시간형 전체 기준답안
- 학습용 확장 기준답안
- 답안 전후 비교
- 재작성·다시 계산 후 재검토
- 자동 오답노트
- 개인 핵심개념 그래프
- 반복 약점과 유사 기출 추천
- Today Plan max three

## 4. Reference Answer Policy

공식 답안이 없는 기출에는 **답안길 검증형 학습 기준답안**을 제공한다.

이는 공식 모범답안이나 공식 채점기준이 아니다. 다음 절차를 통과해야 공개할 수 있다.

- 문제 요구사항·배점 분해
- 공식/public source pack 구성
- 최소 3개 독립 후보 답안
- 법규·이론·실무별 validator
- critic 반대검토
- consensus 및 충돌 처리
- source·계산·루브릭 검증
- release gate

실무 계산 불일치, 법규 source 불일치, unresolved blocker가 있으면 공개하지 않는다.

## 5. Subject Engines

### 법규

쟁점 → 법령·법리·판례 → 요건 → 포섭 → 결론

핵심 품질:

- 시험일 기준 법령 버전
- 조문·판례 검증
- 포섭 근거
- 결론 일치

### 이론

쟁점·의의 → 정의 → 이론적 근거 → 구성·비교 → 적용 → 결론

핵심 품질:

- 정의·개념 관계
- 이론적 근거
- 비교축
- 문제 요구 적합성
- 답안 압축

### 실무

전제·자료 선택 → 방식·산식 → 계산 → 단위·시점·반올림 → 검산 → 결론

핵심 품질:

- fixed calculator model: `casio_fx_9860giii`
- reset-safe hand-keyed GIII routine
- no stored-program dependency
- deterministic recalculation
- 단위·차원 검사
- 역산 검산
- 표 OCR confidence
- fail-closed unsupported type handling

## 6. Learning Memory

모든 첨삭과 재작성에서 자동으로 학습 신호를 남긴다.

- 과목·기출·개념 노드
- 오류 유형
- 실제 답안 evidence
- 왜 틀렸는지
- 올바른 원리
- 즉시 고칠 행동
- 반복 횟수
- 개선·회복·재발 상태
- 다음 복습일

사용자가 별도 오답노트를 작성하지 않아도 핵심개념 카드와 개인 개념 그래프가 누적되어야 한다.

## 7. Product Surfaces

### Learner app

- source/rights metadata 기반 기출 운영
- 답안 작성·촬영
- 연습채점·첨삭
- 검증형 기준답안
- 비교·재작성
- 오답노트
- 핵심개념 그래프
- Today Plan·복습 큐

### Academy console

학원용 별도 tenant 표면이다.

- 과제·기출 배포
- 답안 일괄 수집
- AI 채점·첨삭 초안
- 강사 수정·승인
- 학생·반 약점 분석
- 재작성 관리
- export·retention·usage

Inverge는 전문가 검수 소비자 상품을 판매하지 않는다.

## 8. Commercial Shape

- `free`: 0 KRW, 평생 full-value review 1회
- `second_os_basic`: 월 59,000~69,000원 가설
- `second_os_pro`: 월 119,000~149,000원 가설
- `second_control_premium`: 월 249,000~299,000원 가설
- `deep_review_5`: 49,000원 가설
- `deep_review_15`: 129,000원 가설
- `deep_review_40`: 299,000원 가설
- `managed_cohort`: 690,000~990,000원 / 8 weeks, later only disabled
- `season_pass`: later only disabled
- Academy Team: 월 1,490,000원 가설
- Academy Pro: 월 3,900,000원 가설
- Enterprise: 월 7,000,000원부터 가설

No unlimited second-exam precision review, 전문가 첨삭 중개, 합격 보장 상품은 만들지 않는다.

가격은 paid beta 데이터로 검증하되 구현 구조는 configurable catalog, entitlement, usage ledger, refund, privacy, cost guardrail을 지원해야 한다.

## 9. Required Framing

사용 권장:

- 답안길
- 답안길 2차 합격관제 OS
- 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS
- Evidence Review
- 답안 검토 리포트
- 합격관제 리포트
- 연습점수 범위
- 가장 큰 간극
- 다음 행동
- 재작성·다시 계산
- GIII 실무 루틴
- 자동 오답노트·핵심개념

사용 금지:

- 공식 채점
- 확정 점수
- 공식 모범답안
- 합격 가능성·합격 확률
- 합격 보장
- AI 최종 판정

## 10. Execution Principles

- 한 화면, 한 주행동
- attempt before reveal 기본값
- 사용자 override 허용
- 결과마다 다음 행동
- Today Plan 최대 3개
- source·rights·verification 상태 명시
- raw learner content와 reference corpus 분리
- learner와 academy tenant 분리
- 세 과목 통합 출시 게이트 우회 금지

## 11. Documentation Map

- 최종 제품 명세: `docs/inverge-second-round-final-product-spec.md`
- S200R premium OS brief: `docs/dabangil-second-exam-premium-os.md`
- GIII 실무 루틴 정책: `docs/dabangil-giii-practical-routine.md`
- Deep Review Unit 정책: `docs/dabangil-deep-review-unit-policy.md`
- 공장 실행 순서: `roadmap/active-program.yml`
- 에이전트 헌법: `AGENTS.md`
- 사업모델: `docs/inverge-business-model.md`
- 통합 로드맵: `docs/inverge-master-roadmap.md`
- 데이터 거버넌스: `docs/inverge-data-governance.md`
- 법령 source ingest: `docs/inverge-legal-source-ingest.md`
- 디자인 시스템: `docs/inverge-design-system.md`
