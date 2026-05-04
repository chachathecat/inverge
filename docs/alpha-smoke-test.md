# Alpha Smoke Test Checklist

목표: 신규 알파 사용자가 개발자 도움 없이 아래 루프를 1회 완료할 수 있는지 확인합니다.

`capture → editable draft → save → session → today plan → review queue → item detail`

## 사전 조건
- 테스트 계정 2개(User A / User B) 준비
- 각 계정은 로그인 또는 초대 링크 접근 가능
- 기본 모드는 감정평가사 1차 또는 2차 중 하나를 명시

## 체크리스트
- [ ] **login/invite access**: 로그인/초대 링크 진입이 정상 동작한다.
- [ ] **/app capture first mode**: `/app/capture?mode=first` 진입 및 입력이 가능하다.
- [ ] **/app capture second mode**: `/app/capture?mode=second` 또는 `/app/write?mode=second`에서 입력이 가능하다.
- [ ] **mobile photo input**: 모바일 카메라 입력(`capture="environment"`)이 노출되고 선택 가능하다.
- [ ] **image OCR failure fallback**: OCR 실패 시 안내 문구와 수동 입력 흐름이 유지된다(초안 보존 확인).
- [ ] **PDF manual mode**: PDF 업로드 후 수동 편집으로 이어질 수 있다.
- [ ] **save success**: 저장 후 세션 화면으로 이동하고 `savedCaptureItemId` 기반 반영이 보인다.
- [ ] **session handoff**: 세션 화면에 방금 저장한 항목의 핵심 신호(가장 큰 간극/다음 행동)가 그대로 보인다.
- [ ] **review queue visibility**: review queue에서 저장 항목이 확인되고, 캡처 기원 라벨(오늘 기록에서 생성)이 표시된다.
- [ ] **item detail visibility**: 아이템 상세에서 `정리된 초안`, `가장 큰 간극`, `다음 행동`이 보인다.
- [ ] **instructor route access control**: 학습자 UI에서 `/instructor` 동선이 노출되지 않는다.
- [ ] **user A/B data separation sanity check**: User A에서 저장한 항목이 User B에 보이지 않는다.

## 합격 기준
- 위 체크리스트 전체 통과.
- 신규 알파 사용자 1명이 단일 학습 루프를 독립적으로 완료.
- 클로즈드 알파 전, 체크리스트를 릴리즈 게이트로 재실행.
