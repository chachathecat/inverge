# S231C light-only and accessibility acceptance

## Product decision

답안길은 S231C부터 명시적으로 light-only입니다. 기존 dark 경로는 일부 별칭 토큰만 바꾸고 v3 canvas, surface, text, CTA, trust, focus primitive와 직접 색상을 함께 바꾸지 않아 핵심 텍스트와 동작이 보이지 않을 수 있었습니다. 사용자 선택 UI도 없는 상태에서 과거 `localStorage` 값만 dark를 활성화할 수 있었으므로 런타임 경로와 dead provider를 제거했습니다.

`data-theme="light"`, Next viewport의 `colorScheme: "light"`, CSS `color-scheme: light`, PWA background가 하나의 계약입니다. 과거 `inverge:theme-mode` 값은 더 이상 읽거나 적용하지 않습니다.

Dark mode는 다음 조건을 모두 만족하는 별도 작업에서만 다시 활성화할 수 있습니다.

- canvas/surface/elevated/text/action/trust/status/focus/chart/input/overlay semantic token이 light와 dark 양쪽에 완전하게 정의됨
- 핵심 learner route와 공용 primitive에서 raw palette 및 직접 색상 사용이 제거되거나 검토된 allowlist에 포함됨
- 390/768/1440에서 light/dark, native control, reload/initial paint, 모든 trust state를 검증함
- 일반 텍스트 4.5:1, 큰 텍스트와 UI/focus 3:1 이상을 계산하고 axe critical/serious 0을 증명함

## Automated evidence

Exact-head Preview 검증은 다음을 metadata-only manifest로 남깁니다.

- core learner route별 axe WCAG A/AA critical·serious 0
- light-only runtime 계약과 과거 dark preference의 비활성 상태
- skip link와 learner navigation의 키보드 이동, visible focus, focus indicator 3:1 이상
- 390/768/1440 및 200% desktop-equivalent layout의 horizontal overflow 0
- 200% text resize에서 필수 heading/control clipping 0
- reduced-motion media query 활성화와 animation/transition suppression
- console, page, same-origin request error 0

Manifest에는 route, rule id, impact, node count, 수치형 결과만 기록합니다. learner answer, OCR/reference prose, 이메일, credential, DOM HTML, screenshot, trace, video는 게시하지 않습니다. 자동 검증은 실제 브라우저 zoom이나 screen reader certification으로 표기하지 않습니다.

## Manual acceptance gate

아래 수동 검증은 PR 병합 전 실제 사람이 완료하고 PR에 환경·날짜·결과만 기록합니다. 계정 정보나 학습 원문은 기록하지 않습니다.

### Browser 200%

- Chrome 또는 Edge desktop에서 zoom 200%
- `/app`, `/app/capture?mode=second`, `/app/review?mode=second`, `/app/notes?mode=second`, `/app/agenda?mode=second`, `/answer-review?mode=second`
- 좌우 페이지 스크롤 없음, 필수 heading/control 잘림·겹침 없음, sticky action이 content/focus를 가리지 않음

### NVDA or VoiceOver

- NVDA + Chrome/Firefox 또는 VoiceOver + Safari
- skip link가 main으로 이동하고 각 page의 main·heading·navigation 이름이 한 번씩 명확히 읽힘
- keyboard만으로 learner navigation → capture → text input → confirmation 단계까지 이동 가능
- button/link/input의 이름·상태·오류가 문맥 없이도 이해 가능하고 focus가 사라지거나 trap에 갇히지 않음
- trust state는 화면에 존재하는 근거만 읽고 공식 채점·확정 점수·합격 가능성을 암시하지 않음

수동 증거 형식: `tester`, `date`, `OS`, `browser`, `assistive technology`, `routes`, `result`, `issues`. `manualScreenReaderCertification`은 이 기록이 연결되기 전까지 항상 `false`입니다.
