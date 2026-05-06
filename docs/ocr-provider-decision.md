# OCR Provider Decision & One-Source Pilot Plan

## Purpose

이 문서는 과거 기출 source PDF에 대해 실제 OCR provider를 안전하게 연결하기 위한 의사결정 프레임워크를 정의한다. 현재 단계의 목표는 운영자 검수 중심의 내부 파일럿을 설계하는 것이며, 학습자 대상 기능 확장은 포함하지 않는다.

## Candidate providers

- **Gemini vision/OCR**
- **Google Document AI**
- **local/manual extraction** (현재 manual stub 포함)
- **future provider** (추가 벤더 후보)

## Evaluation criteria

실제 provider 연결 전 아래 기준으로 동일 문서를 비교 평가한다.

1. **Korean PDF handling**
   - 한글 본문, 머리말/꼬리말, 각주, 줄바꿈 보존 품질
2. **table/numeric extraction quality**
   - 표 구조 복원, 숫자/단위/기호(%, 원, ㎡ 등) 정확도
3. **handwritten vs printed text distinction**
   - 수기 메모/필기와 인쇄 텍스트 구분 가능성
4. **cost**
   - 페이지당 비용, 월간 파일럿 예산 적합성
5. **latency**
   - 단건 처리 지연 및 재시도 시 총 소요 시간
6. **data retention/privacy**
   - 데이터 저장 정책, 보존 기간, 리전/삭제 제어 가능성
7. **failure modes**
   - 타임아웃, 부분 추출, 레이아웃 붕괴, 숫자 오인식 시 복구 전략
8. **review workflow compatibility**
   - `reference_only` + `needs_review` 운영 흐름과의 일관성

## Required guardrails

실제 provider 도입 시에도 아래 원칙은 필수다.

- extracted text는 **reference_only** 정책으로 저장한다.
- review_status의 초기값은 **needs_review** 로 시작한다.
- learner-facing surface에는 **raw source text를 노출하지 않는다**.
- **official answer/scoring claims** 를 하지 않는다.
- reference DB에는 **raw user OCR/user answer data를 저장하지 않는다**.

## One-source pilot plan (before implementation)

파일럿은 아래 단일 문서로만 진행한다.

- source document id: `appraiser-second-2025-36-practice-q1-source-pdf`

운영 조건:

- **internal-only** (학습자 UI 미노출)
- **operator reviewed** (운영자 검수 필수)
- **no learner UI**
- **no automatic reference promotion**

## Out of scope for this PR

- 실제 OCR provider API 호출 구현
- upload route 추가
- learner source viewer 추가
- archive UI 추가
- official answer/scoring/pass-fail 로직 추가
