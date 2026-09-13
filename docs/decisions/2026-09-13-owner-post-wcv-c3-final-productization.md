# Owner 결정 — Post-WCV-C3 제품화 기준

날짜: 2026-09-13  
프로그램: `INVERGE_OWNER_STUDY_OS`  
전달 ID: `STUDY_OS_S1_PRODUCTIZATION_SOURCE`

## 결정

첫 강한 제품은 감정평가사 2차 signed-in Web/PWA다. 학습자는 문제·답안·PDF·
사진을 올리고, 온라인 검토에서 가장 큰 감점 원인 하나를 찾고, 쉬운 설명을
본 뒤 직접 고친다. 다음 날, 일주일 뒤, 제한시간 수행에서 같은 오류가 다시
나타나는지를 독립적으로 확인하고 그 증거로 오늘 할 공부를 정한다.

이 결정은 #772/#776의 S1을 설치하고 #771, #773, #774, #775를 연결한다.
활성 마스터를 교체하거나 새 control plane을 만들지 않는다.

## 순서

`S0 → S1 → S2 → S3 → S4 → S4A → S4B → S5 → S6`

- S2: 한국어 첫 화면과 한 가지 행동
- S3: Owner-only Production Web. 정확한 별도 Owner 승인 전에는 실행 금지
- S4: 실무·이론·법규 공통 학습 흐름
- S4A: #773 `한번 눌러 이해하기`
- S4B: #774 선택형 표시 모드. 기본 학습 흐름이 맞은 뒤에만 진행
- S5: Owner Golden과 dogfood
- S6: 합성 데모와 signed-in 기술 trial

캘린더·개념 모음, 공식 자료 수집, 개인 문제 생성, 유료화, native 배포는
별도 조각이다. 첫 강한 2차 trial을 지연시키지 않는다. 1차 5과목은 취소하지
않으며 2차 기술 trial 뒤에 반드시 이어지는 프로그램으로 보존한다.

## 멈춤 경계

이 source-only 결정은 runtime, UI, API, DB·RLS·Storage, migration, secret,
environment, provider, dependency, 실제 콘텐츠, Production, 결제, 공개, 실제 학습자,
native store를 활성화하지 않는다. 이 항목은 각각 적용 시점의 정확한 Owner
승인이 필요하다. 일반 코드·테스트·review 수정과 비Production 병합은 기존
권한 안에서 계속한다.

공개되어 있다는 이유만으로 콘텐츠 이용 권한을 추정하지 않는다. 개인 업로드의
문제·답안·OCR·노트·첨부·AI 본문은 shared cache, 분석, 문제 생성, model
training으로 보내지 않는다.
