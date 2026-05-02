# 감정평가사 1차·2차 기출 아카이브 데이터 포맷 (Canonical v1)

이 문서는 `/exams/archive` 용 시드 입력의 **표준 JSON 형식**을 정의합니다.

- 대상 범위: 감정평가사 1차 / 2차
- 목적: 안전한 데이터 적재(검증, 추적, 재실행 가능)
- 주의: 샘플 데이터는 반드시 비실제(placeholder) 문구를 포함해야 함

## 1) 최상위 구조

```json
{
  "version": 1,
  "source": {
    "name": "manual-sample",
    "note": "placeholder data only"
  },
  "exams": []
}
```

- `version`: 현재 `1`만 허용
- `source.name`: 데이터 출처 식별자 (예: `manual-sample`, `internal-review-batch-2026-05`)
- `source.note`: 출처 관련 메모
- `exams`: 시험 배열

## 2) 시험 단위(exam)

```json
{
  "year": 2024,
  "round": 35,
  "type": "first",
  "subjects": []
}
```

- `year`: 연도 (합리적 범위의 정수)
- `round`: 회차 (양의 정수)
- `type`: `"first" | "second"`
- `subjects`: 과목 배열

## 3) 과목 단위(subject)

```json
{
  "name": "민법",
  "questions": []
}
```

- `name`: 비어 있지 않은 문자열
- `questions`: 문항 배열

## 4) 문항 단위(question)

공통 필드:

```json
{
  "questionNo": 1,
  "questionText": "샘플 지문입니다. 실제 기출 원문이 아닙니다.",
  "explanation": "샘플 해설입니다. 실제 해설이 아닙니다.",
  "tags": ["sample"],
  "isVerified": false
}
```

- `questionNo`: 양의 정수
- `questionText`: 비어 있지 않은 문자열
- `explanation`: 선택
- `tags`: 선택 (문자열 배열)
- `isVerified`: 선택 (`true | false`)

### 1차(first) 문항 확장

```json
{
  "choices": ["① 샘플", "② 샘플", "③ 샘플", "④ 샘플", "⑤ 샘플"],
  "answerText": "③"
}
```

- `choices`: 선택지 배열(있다면 배열이어야 함)
- `answerText`: 정답 텍스트(시드 시 필수)

### 2차(second) 문항 확장

```json
{
  "modelAnswer": "샘플 모범답안입니다. 실제 답안이 아닙니다.",
  "gradingPoints": ["쟁점 식별", "논리 전개", "사안 적용"]
}
```

- `modelAnswer`: 모범답안 텍스트(시드 시 필수)
- `gradingPoints`: 채점 포인트 배열(선택)

## 5) 저장 매핑 (Supabase)

- `public.exams`: `year`, `round`, `type`
- `public.questions`: `exam_id`, `subject`, `question_no`, `question_text`, `choices`, `explanation`
- `public.answers`: `question_id`, `answer_text`, `answer_type`, `answer_metadata`
  - 1차: `answer_type='objective_answer'`, `answer_text=answerText`
  - 2차: `answer_type='model_answer'`, `answer_text=modelAnswer`, `answer_metadata.gradingPoints=[...]`

## 6) 검증 및 반입 정책

- 실데이터 반입 전 필수:
  - 원문 출처 확인(source-check)
  - 검수 상태 확인(`isVerified` 등 내부 정책)
- 샘플 파일은 반드시 비실제 문구를 명시:
  - `샘플`
  - `실제 기출 원문이 아닙니다`
  - `실제 답안이 아닙니다`
- 중복 키(`year/round/type/subject/questionNo`)는 하나의 입력 파일 내에서 허용하지 않음

- `answers(question_id, answer_type)` 고유 인덱스 적용 전 주의:
  - 기존 DB에 동일 `question_id`의 중복 answer 행이 있으면 인덱스 생성이 실패할 수 있음
  - 인덱스 적용 전에 중복 answer 행을 먼저 통합(consolidate)한 뒤 적용

## 7) 전체 예시

```json
{
  "version": 1,
  "source": {
    "name": "manual-sample",
    "note": "placeholder data only"
  },
  "exams": [
    {
      "year": 2024,
      "round": 35,
      "type": "first",
      "subjects": [
        {
          "name": "민법",
          "questions": [
            {
              "questionNo": 1,
              "questionText": "샘플 지문입니다. 실제 기출 원문이 아닙니다.",
              "choices": ["① 샘플", "② 샘플", "③ 샘플", "④ 샘플", "⑤ 샘플"],
              "answerText": "③ 샘플 정답",
              "explanation": "샘플 해설입니다. 실제 해설이 아닙니다.",
              "tags": ["sample"],
              "isVerified": false
            }
          ]
        }
      ]
    },
    {
      "year": 2024,
      "round": 35,
      "type": "second",
      "subjects": [
        {
          "name": "감정평가이론",
          "questions": [
            {
              "questionNo": 1,
              "questionText": "샘플 사례형 문제입니다. 실제 기출 원문이 아닙니다.",
              "modelAnswer": "샘플 모범답안입니다. 실제 답안이 아닙니다.",
              "gradingPoints": ["쟁점 식별", "논리 전개", "사안 적용"],
              "explanation": "샘플 해설입니다.",
              "tags": ["sample"],
              "isVerified": false
            }
          ]
        }
      ]
    }
  ]
}
```
