# Source PDF Ingestion Protocol v0

## Purpose

본 문서는 감정평가사 기출 PDF 원문을 **참조 데이터 소스**로 연결하기 위한 최소 프로토콜을 정의합니다.

- 기출 문제의 메타데이터 보강
- topic tags / issue tags 생성 보조
- answer skeleton 후보 생성 보조
- QA 추적 가능성(원문 출처, 변환 단계, 리뷰 이력) 확보

핵심 원칙은 다음과 같습니다.

- PDF 원문과 추출 텍스트는 **reference-only** 데이터입니다.
- 원문에서 파생된 구조화 후보는 반드시 **사람 검수**를 거칩니다.
- learner-facing 결과물은 학습 보조 목적(구조/체크포인트/쟁점 태그)으로 제한합니다.

## Non-purpose

다음은 본 프로토콜의 범위가 아닙니다.

- 공식 모범답안 제공
- 공식 채점 기준 확정/제공
- 합격/불합격 판단 또는 pass/fail 판정
- 공개 기출 아카이브 브라우징 UI 제공
- 대규모(예: 20년치) 일괄 업로드 롤아웃

## Data Policy

### 1) Source data classification

- source PDF는 `reference_only`로 분류합니다.
- reference DB에는 원문 신뢰도가 아닌 **review status**를 명시합니다.

### 2) Extraction policy

- 추출 텍스트(OCR/파서 출력)는 자동 생성 결과로 간주합니다.
- 자동 추출 텍스트는 곧바로 정답/기준 데이터로 승격될 수 없습니다.
- 추출 단계 이후 상태는 최소 `needs_review`를 요구합니다.

### 3) Skeleton policy

- source PDF 기반으로 생성된 skeleton 후보는 기본적으로 `needs_review` 상태입니다.
- 검수 이전에는 learner-facing 최종 규칙으로 노출하지 않습니다.

### 4) User data separation

- raw user OCR / raw user answer 데이터는 reference DB로 유입하면 안 됩니다.
- 사용자 제출 데이터와 기출 source 데이터는 저장 경로/테이블/권한을 분리합니다.

## Workflow

아래 순서대로 처리합니다.

1. **PDF source metadata 등록**
   - 시험 연도/회차/과목/스테이지
   - 저장 경로
   - 초기 상태(`uploaded`)

2. **텍스트 추출(extraction)**
   - 파서/OCR 수행
   - 추출 산출물 생성
   - 상태 업데이트(`extracted`)

3. **구조화 candidate 생성**
   - 문제 메타데이터 후보
   - topic/issue tag 후보
   - skeleton/checkpoint 후보
   - 자동 생성 결과 상태는 `needs_review`

4. **사람 검수(human review)**
   - 원문-추출문-구조화 후보 대조
   - 과장/오독/누락 여부 검증
   - 필요한 수정 반영

5. **PastExamReferenceItem 연결**
   - 검수된 source를 `PastExamReferenceItem`과 연결
   - 참조 추적을 위해 linked reference id 유지

6. **Learner UI 노출 제한**
   - learner-facing에는 skeleton/checkpoint/issue tags만 사용
   - 공식 답안/공식 채점기준/판정성 문구는 노출 금지

## Guardrails

- 기본 source 상태는 `needs_review` 우선입니다.
- `reviewed` 전환은 사람 검수 완료 이후에만 허용합니다.
- 본 프로토콜은 기출 PDF의 학습 보조적 구조화를 위한 것이며, AI 단독 최종판정 도구를 만들기 위한 문서가 아닙니다.
