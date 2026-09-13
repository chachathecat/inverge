# 답안길 선택형 표시 모드 v1

표시 모드는 학습 진실을 바꾸지 않는다. `STANDARD`가 기본이며 완전한 기능을
제공한다. `GAMEFUL`은 명시적 opt-in이고 언제든 끌 수 있다.
`LOW_STIMULATION`은 기능을 덜 주는 모드가 아니라 motion·소리·시각 자극을 줄인
동등한 모드다. 설정 변경기기는 바뀔 수 있어도 답안, 가장 큰 간극, 증거,
다음 행동, eligibility, due time, 숙달, 점수, entitlement, usage, cost는 세 모드가
같은 trusted server state를 사용한다.

Gameful 표현은 독립적인 학습 엔진이 아니며 운영 kill switch로 끌 수 있어야
한다. 이를 꺼도 Standard의 모든 기능과 기존 기록은 그대로 남는다.

화면 표현은 `오늘의 관문`, `복구 연계`처럼 실제 행동을 함께 말한다. 표준
학습자 표현은 화면과 접근성 이름에 남긴다. 무작위 보상, 벌점형 streak, 공개
순위 압박, 수치심, 인위적 희소성, pay-to-repair는 금지한다. 출석·앱 열기·화면
체류·도움 열람을 학습 증거로 만들지 않는다.

OS reduced-motion을 존중하고 더 적은 motion을 선택할 수 있어야 한다. 소리와
haptic은 직접 켜기 전에는 꺼져 있다. 색이나 소리만으로 상태를 전달하지 않으며
keyboard, screen reader, 선형 텍스트 동등물, 200% reflow, 390/768/1440을
지원한다. S4 기본 흐름이 정확하기 전에는 S4B runtime을 시작하지 않는다.
