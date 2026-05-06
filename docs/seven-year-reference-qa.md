# Seven-Year Reference QA (2019-2025)

## 목적
2019-2025 7개년 기출 레퍼런스 레이어가 안정적으로 동작하는지 확인하고,
추가 연도 확장이나 원문 PDF 연결 전에 알파 기준 품질을 검증한다.

## 범위
- 대상 연도: 2019, 2020, 2021, 2022, 2023, 2024, 2025
- 대상 과목(2차):
  - 감정평가실무
  - 감정평가이론
  - 감정평가 및 보상법규
- 제외:
  - 신규 연도 추가
  - PDF 인제션 연결
  - 아카이브 탐색 UI 추가

## 자동 검증 실행

```bash
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/past-exam-reference.test.mjs tests/capture-loop-surfacing.test.mjs tests/capture-note-engine.test.mjs
```

검증 포인트(테스트 기준):
- 2019-2025 레퍼런스 시드 로드
- 연도별 3과목 완전성
- id 유일성 + 과목 식별 가능성
- similar_question_refs 무결성
- `source_status: "needs_review"` 강제
- `raw_text_policy: "reference_only"` 강제
- taxonomy/skeleton 필수 필드 non-empty
- 동일 점수 시 최신 연도 우선 tie-break
- 과목 정렬 정합성(동일 과목 상위 노출)
- `buildAnswerSkeletonGuide` 전체 레퍼런스 동작
- 공식답안/공식채점/합불 언어 차단

## 결과
- 테스트 22개 전부 통과.
- 2019-2025 7개년 레퍼런스 레이어는 알파 기준에서 안정 상태.
- 신규 연도 추가 없이 현재 데이터 품질 점검 목적 달성.

## 빌드 상태

```bash
npm run build
```

- 현재 실행 환경에서 `next` 실행 파일이 없어 빌드 커맨드는 실패함.
- 코드/테스트 레이어 기준 QA는 통과했으며, CI 또는 앱 런타임 의존성이 갖춰진 환경에서 빌드 재확인이 필요함.

## 알파 게이트 판정
- 레퍼런스 레이어(2019-2025): **Stable for Alpha**
- 후속 작업 권장 순서:
  1) CI/프리뷰 환경에서 빌드 재검증
  2) Vercel Preview Ready 확인
  3) 이후 연도 확장 또는 PDF 소스 연결 진행
