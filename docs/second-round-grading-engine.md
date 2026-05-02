# 감정평가사 2차 채점관 모드 그레이딩 엔진 계약서

## 목적
이 문서는 기존 `answer-review structure` 흐름과 분리된 **2차 채점관 모드**의 계약을 정의한다.
- 기존 `/api/answer-review/structure` 동작을 변경하지 않는다.
- 본 계약은 점수/감점/합격가능성 시뮬레이션을 포함하는 별도 엔진에만 적용된다.

## 모드 분기
1. **problem-only mode (`problem_only`)**
   - 입력: 문제 본문(필수), 기준자료(선택)
   - 출력: 쟁점 게이트 초안, 동적 루브릭 틀, 스켈레톤 모델답안, 약점 드릴
   - 점수는 학습 준비 지표로만 제한적으로 제공하거나 `판단 불가` 처리
2. **problem + user answer grading mode (`grade_answer`)**
   - 입력: 문제 본문 + 수험생 답안
   - 출력: 루브릭 점수, 감점, 최종점수, 합격가능성 시뮬레이션, 스켈레톤, 약점드릴
   - 근거는 반드시 입력 답안 텍스트 내부에서만 추출

## Issue Gate
- 핵심 쟁점 누락/오판 수준이 중대하면 `issueGate.triggered = true`.
- 게이트가 발동되면 잠금 점수(`lockScoreTo`)를 최종 점수보다 우선 적용.

## 문항 유형별 동적 루브릭
- theory: issue 25 / structure 20 / standard 25 / application 20 / conclusion 10
- law: issue 25 / structure 15 / legalRule 25 / application 25 / conclusion 10
- practice: issue 15 / structure 10 / standard 15 / application 50 / conclusion 10

## 점수 계산 순서
1. 루브릭 점수 산출
2. baseScore 산출
3. 감점 누적(cumulative deductions)
4. issue-gate lock 적용
5. 최종점수 0~100 clamp

## 감점 규칙
- issue error: -30
- weak application/subsumption: -25
- calculation/formula error: -20
- insufficient legal rule/case/statute: -15
- weak logic/table-of-contents structure: -10

## 이중감점 방지
- 동일 root cause는 1회만 감점.
- 단, issue spotting failure는 항상 독립 누적 가능.

## 스켈레톤 모델답안 규칙
- 문단형 모델답안 금지
- 완성형 prose 답안 금지
- 아웃라인/배열 기반 출력만 허용
- 키워드/법규·판례/수식/적용 방향만 제시
- 모든 수식은 LaTeX 문자열로 출력

## 합격가능성 시뮬레이션 밴드
- very_low / low / medium / high
- 점수와 근거 품질을 함께 반영하되, 추정값임을 명시

## 약점 드릴 생성 규칙
- 가장 치명적 약점 1개를 약 15% 개선하도록 변환
- 5분 미니 퀴즈 1개 생성
