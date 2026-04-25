# Inverge Instructor Console (B2B) Scope

## 1) Purpose and Non-Goal
본 문서는 학습자 서비스와 분리된 B2B 표면으로서 **학원용 답안 운영 콘솔**의 범위와 가드레일을 정의한다.

Purpose:
- 학원 운영 환경에서 답안 처리/첨삭 흐름의 효율을 높이는 **첨삭 운영 보조**
- 강사의 의사결정을 대체하지 않고, 검수 가능한 초안을 제공

Non-goal:
- AI 최종 채점
- 자동 합격 판정
- 무검수 채점

## 2) Users and Access
Allowed users:
- academy staff
- instructors
- graders

Access principle:
- instructor/admin role only
- learner 계정/권한과 분리

## 3) Functional Scope (Draft Assistance Only)
허용 기능:
1. OCR answer upload (이미지/스캔 답안 수집)
2. rubric-based **채점 초안** 생성
3. feedback/comment draft 생성
4. reference answer draft 제안
5. 검수 큐/처리 상태 관리(초안 → 검수중 → 확정)

핵심 원칙:
- 모든 채점/코멘트/정답해설 초안은 **강사 검수** 후에만 확정/전달 가능
- 시스템은 “초안 생성 및 운영 보조” 역할만 수행

## 4) Language Policy
Must-use wording:
- 학원용 답안 운영 콘솔
- 첨삭 운영 보조
- 채점 초안
- 강사 검수

Must-not-use wording:
- AI가 최종 채점
- 자동 합격 판정
- 무검수 채점
- 학생 답안 무단 학습

## 5) Separation from Learner App
- 라우팅 방향: `/instructor` 또는 `/studio` (future)
- learner 홈/내비게이션/온보딩에 instructor 기능 노출 금지
- learner-facing Inverge 정의(감정평가사 합격 운영 시스템)와 문구 혼합 금지

## 6) Human-in-the-Loop Approval Requirements
필수 승인 단계:
1. Draft 생성
2. 강사 검수(내용/점수/근거 확인)
3. 수정 또는 승인
4. 승인 이력 저장(승인자, 시각, 변경 요약)

출력 정책:
- 승인 이전 산출물은 internal draft status로만 보관
- 승인 이후에만 공식 피드백/점수로 사용

## 7) Risks and Controls
Primary risks:
- 초안을 최종판정으로 오인
- 테넌트 간 데이터 혼합
- 제3자 저작물 무권한 재사용
- raw 제출물의 무단 모델 학습 전용

Required controls:
- role-based access control (instructor/admin)
- tenant isolation
- consent/reuse flag enforcement
- dataset lineage + approval logs
- deletion/export policy hooks

## 8) Implementation Status
현재 문서는 정책 정의만 포함한다.

Not included in this PR:
- runtime application code changes
- UI redesign
- new routes/pages
- auth implementation

후속 구현 PR에서 권한/라우팅/감사로그/데이터계층을 단계적으로 반영한다.
