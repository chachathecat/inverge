# 답안길 실행 기준 색인

이 색인은 새 마스터플랜이 아니다. 충돌이 생겼을 때 이미 존재하는 자료를
어떤 순서로 읽을지만 고정한다.

## 우선순위

1. live GitHub `main`, 실제 런타임 상태, 보호된 병합 영수증
2. 적용 가능한 날짜가 있는 Owner 결정
3. `AGENTS.md`
4. 닫힌 기계 계약과 `roadmap/active-program.yml`
5. 현재 제품 계약
6. QA·검증 기록과 회귀 테스트
7. 계획 이슈 #771–#776
8. 과거 전략 문서, handoff, prompt pack, 폐기된 roadmap

계획 이슈와 과거 문서에 들어 있는 SHA, 상태, 실행 문구는 현재 런타임 권한이
아니다. 현재 GitHub 상태와 충돌하면 실행하지 않는다.

## 현재 제품화 패키지

`POST_WCV_C3_PRODUCTIZATION_V1`은 기존 `INVERGE_OWNER_STUDY_OS` 아래의
하위 source-only 계약이다. 활성 마스터를 바꾸거나 V14를 만들지 않는다.

- 결정: `docs/decisions/2026-09-13-owner-post-wcv-c3-final-productization.md`
- 2차 Web/PWA: `docs/product/dabangil-second-round-web-pwa-product-constitution-v1.md`
- 한국어: `docs/product/dabangil-korean-learner-language-v1.md`
- 한번 눌러 이해하기: `docs/product/dabangil-one-touch-understanding-v1.md`
- 표시 모드: `docs/product/dabangil-gameful-evidence-mode-v1.md`
- 1차 5과목: `docs/product/dabangil-first-round-adaptive-mcq-program-v1.md`
- 기계 계약: `config/dabangil-post-wcv-c3-productization-v1.json`
- 검증: `docs/qa/dabangil-post-wcv-c3-productization-validation.md`

이 패키지는 #772와 #776을 설치하며 #771, #773, #774, #775를 하위 계약으로
연결한다. UI, API, 데이터베이스, 제공자, 콘텐츠, 배포, 결제 또는 실제 사용자를
켜지 않는다.
