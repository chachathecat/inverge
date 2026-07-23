# Inverge Data Governance

## Post-#650 authority

The canonical plane model is Personal Raw Vault, Academy Tenant Vault, Shared
Signal Plane, Cleared Content Bank, and Model/Eval Registry as defined by
`docs/dabangil-unified-program-contract.md`. The older layers below remain
implementation guidance only where they map without loss to those five
planes.

- Private raw content has no automatic path to a shared corpus.
- Q-Net rights are decided per source post and per attached asset; content
  inherits the most restrictive decision.
- Private/Academy fingerprints are domain-separated and vault-scoped.
- Those fingerprints are keyed/one-way with vault-specific non-exportable
  domain keys and never return an equality oracle.
- Global dedup requires material already promoted into the Cleared Content
  Bank. The basis is rights-cleared official/owner-created/contracted
  content, or a separately authored, actually rights-owned user contribution
  object; O3/review and quarantine always apply. It cannot reclassify a raw
  service answer, note, handwriting artifact, or OCR extraction.
  Pseudonymous-signal consent alone is insufficient.
- After applicable rights prerequisites and user-owned contribution consent
  where required, promotion quarantine may compare a candidate to the
  Cleared Content Bank with an access-controlled, domain-separated,
  least-privilege internal fingerprint. It emits only decision metadata, no
  equality signal outside quarantine, and creates no global identifier before
  promotion.
- Promotion requires rights/version/reviewer evidence plus
  conflicting-answer, poisoning/anomaly, fingerprint/dedup, and
  held-out-contamination quarantine.
- Consent/opt-out purposes are separate for service processing,
  pseudonymous signals, Academy sharing, user-owned content contribution, and
  offline model training.
- Revocation stops future use for the revoked purpose, including Academy
  sharing, promotion, and offline training/dataset refresh; deletion and
  retention remain purpose-scoped.
- Academy instructor approval alone does not create shared Gold.
- Online model-weight updates from any input are prohibited. All permitted
  training is offline and requires an exact-scope O5 gate.

## 1) Governance Objective
본 문서는 learner-facing Inverge와 별도 instructor-facing B2B 콘솔을 포함한 데이터 처리 원칙을 정의한다.

핵심 목표:
- 서비스 제공 목적과 모델 개선 목적을 명확히 분리
- 동의/계약/권리 범위 내에서만 데이터 재사용
- 테넌트 분리, 접근통제, 삭제/내보내기 준수

## 2) Data Layer Model
아래 4개 계층을 구분해 운영한다.

### v1 Data Classes (private vs derived)
1. raw user answer
2. uploaded image/PDF
3. OCR text
4. user-edited text
5. derived learning signal
6. anonymized aggregate insight
7. product quality metric

분류 원칙:
- 1~4는 사용자 소유 원천 데이터로 service layer에만 저장/처리한다.
- 5는 개별 추천 품질 개선 목적의 파생 신호이며, 원문 복원 가능 형태를 금지한다.
- 6~7은 안전한 익명 집계 기준을 통과한 경우에만 생성한다.

### Layer A: Service Data
정의:
- 서비스 동작에 직접 필요한 원천 데이터
- 예: 답안 이미지, OCR 텍스트, 채점 결과, 피드백 기록, 운영 로그

원칙:
- 기본 목적: 서비스 전달/운영
- raw student answer text/images는 원칙적으로 서비스 전달 외 목적 사용 금지
- service processing은 해당 목적의 lawful basis 범위에서만 허용
- Shared Signal에는 exact-purpose grant를 받은 pseudonymous
  non-reconstructive derived output만 들어가며 raw body는 들어가지 않음
- raw service 답안·필기·note·OCR은 content promotion 대상이 아님
- 사용자가 실제 권리를 가진 별도 창작물의 distinct contribution object만
  contribution consent, rights, O3, quarantine을 거쳐 Cleared Content
  Bank로 이동 가능
- offline training은 O5 아래 consented pseudonymous signal 또는 promoted
  Cleared Content Bank material만 사용하며 direct raw body는 사용하지 않음
- tenant 계약만으로 필요한 learner consent를 대체하지 않음

### Layer B: Derived Product Features
정의:
- 서비스 기능을 위해 가공된 파생 특성/통계
- 예: 문항별 오답 패턴 feature, rubric 항목별 분포, 난이도 추정 지표

원칙:
- 목적 제한(purpose limitation)
- 최소 수집/최소 보관(minimization)
- 접근권한 분리(운영자, 강사, 개발/분석 역할)

### Layer C: Pseudonymized Research Dataset
정의:
- 모델 개선/분석을 위한 가명처리 데이터셋

필수 조건:
- pseudonymization
- purpose limitation
- access control
- retention rules
- 재식별 위험 평가 및 주기적 검토

금지:
- raw 제출물을 연구/학습용 dataset으로 직접 전환
- exact-purpose grant와 O5 없이 offline training 또는 dataset refresh

### Layer D: Tenant Instructor-Approved Candidate Dataset
정의:
- 강사 검수를 통과했지만 Academy Tenant Vault에 남는 고품질 후보
- 예: 강사 승인 점수, 강사 승인 코멘트, 강사 승인 모범답안 초안의 확정본

필수 조건:
- 강사 승인 이력(승인자, 시각, 변경 근거) 저장
- 출처/권리 상태와 결합된 lineage 관리
- 사용 목적별 접근통제
- 강사 승인은 tenant 내부 후보 품질만 뜻하며 shared Gold 승격을 뜻하지 않음
- Cleared Content Bank 승격 전 별도 콘텐츠 권리, tenant 계약, 필요한
  learner consent, promotion review, quarantine 통과

## 3) Reuse and Rights Rules
1. Raw student answer text/images:
   - 기본: 서비스 전달 목적 전용
   - Shared Signal: pseudonymous non-reconstructive derived output만 허용
   - content promotion 대상이 아니며 Cleared Content Bank로 재분류 금지
   - 실제 권리를 가진 별도 창작물은 raw answer와 다른 distinct
     contribution object로만 제출 가능
   - offline training: O5 아래 consented pseudonymous signal 또는 promoted
     Cleared Content Bank material만 허용; direct raw body 금지
   - tenant 계약 또는 일반 service consent만으로 필요한 learner
     consent를 대체하지 않음

2. Model improvement:
   - O5와 offline-model-training exact-purpose grant 필수
   - consented pseudonymous signal 또는 promoted Cleared Content Bank
     material만 사용
   - raw service/Academy body 직접 사용 금지
   - 목적 제한, 접근통제, 보관기간 준수
   - 무기한/포괄적 재사용 금지

3. Third-party materials (문제지, 학원 자료, 모범답안):
   - 권리 없이 글로벌 재사용 금지
   - 계약 범위를 벗어나는 학습/배포 금지
   - rights-uncleared, 계약 범위 밖, 또는 pre-promotion 저작권 문제
     원문은 글로벌 학습 코퍼스로 사용 금지
   - 권리/계약과 O3/review/quarantine을 모두 통과한 material의 유일한
     shared content-body 경로는 approved Cleared Content Bank promotion

4. Consent and flags:
   - consent/reuse flags 저장 및 정책 집행에 사용
   - 사용자/학원 단위로 상태 추적

5. Tenant separation:
   - academy tenant 간 데이터 물리/논리 분리 원칙
   - 교차 조회/혼합 파이프라인 금지

6. Deletion/export:
   - applicable 법/계약 범위 내 삭제/내보내기 지원
   - 삭제 요청 시 하위 파생데이터 영향 범위 추적
   - 삭제 시 raw answer / image / pdf / ocr text / private notes를 함께 제거
   - export에는 사용자 소유 노트(요약, 주제, 다음 행동)를 포함

7. Aggregate safety:
   - 집계 분석 테이블에는 개인 raw answer/OCR 본문 저장 금지
   - 집계 출력은 개인 답안을 재식별할 수 없도록 익명/최소화 기준을 강제

## 4) Instructor Console Specific Guardrails
- instructor 콘솔은 **첨삭 운영 보조**와 **채점 초안**에 한정
- **강사 검수** 없이는 확정 결과로 사용할 수 없음
- “AI가 최종 채점” 표현 금지
- “학생 답안 무단 학습”을 유도하는 정책/카피/기능 금지

## 5) Audit Requirements
정기 점검 항목:
- human approval requirement 준수 여부
- data reuse consent flag 존재/적용 여부
- tenant separation 테스트 결과
- raw submissions의 무단 학습 여부
- 금지 문구 노출 여부(최종판정/무검수/자동합격)

## 6) Implementation Notes (Future)
후속 구현 PR에서 아래를 반영한다.
- 데이터 계층별 저장소/스키마 분리
- consent/reuse flag schema + enforcement middleware
- instructor approval log schema
- tenant boundary integration tests
- deletion/export 운영 플레이북
