# Anonymous Answer Review Trial QA

## 목적
- 비로그인 사용자 답안 검토 체험 흐름이 명확하게 동작하는지 수동 QA로 확인합니다.
- 전환 메시지(로그인 후 저장/복습/오늘 계획 연결)가 결과 화면에서 분명하게 전달되는지 확인합니다.
- 감정평가사 학습 보조 초안 제품 가드레일(공식 채점/합격 판정 금지)을 유지하는지 확인합니다.

## 대상 흐름
Public landing
→ 답안 1개 올리기 / 검토 예시 보기
→ /answer-review?mode=second
→ answer/photo/text input
→ result shown
→ login CTA for saving result and linking to Today Plan / Review Queue
→ daily trial limit if repeated

---

## 1) Public landing
- [ ] `답안 1개 올리기` CTA가 primary 위치를 유지한다.
- [ ] `검토 예시 보기` CTA는 secondary로 노출된다.
- [ ] 랜딩에 오래된 review-room 무료 체험 카피가 없다.
- [ ] 공식 채점/합격 판정/확정 점수 등 최종 판정성 문구가 없다.

## 2) Anonymous page access
- [ ] Incognito 상태에서 `/answer-review?mode=second` 접속이 가능하다.
- [ ] 로그인 화면으로 리다이렉트되지 않는다.
- [ ] `빠른 답안 정리` 프레이밍이 표시된다.
- [ ] `무료 체험 1회` 배지가 표시된다.

## 3) Anonymous input
- [ ] `답안 스냅으로 시작`이 지원 환경에서 카메라/파일 입력을 연다.
- [ ] `사례 스캔`이 지원 환경에서 카메라/파일 입력을 연다.
- [ ] `PDF/사진 불러오기`가 파일 선택기를 연다.
- [ ] `텍스트 붙여넣기`가 내 답안 textarea 포커스로 이동한다.
- [ ] `내 답안` 입력이 필수로 안내되고, 미입력 시 검토 요청이 차단된다.

## 4) Anonymous result
- [ ] 결과가 화면에 표시된다.
- [ ] learningSignalStatus is skipped.
- [ ] No Review Queue / Today Plan save occurs.
- [ ] 로그인 CTA `로그인하고 기록 저장`이 표시된다.
- [ ] 안내 문구에 아래 의미가 명시된다.
  - 기록 저장, 복습, 오늘 계획 반영은 로그인 후 사용 가능.

## 5) Anonymous limit
- [ ] 같은 날 2번째 성공 요청 시 제한 메시지가 반환된다.
- [ ] 제한 메시지에 아래 문구가 포함된다.
  - 오늘 무료 정리 1회를 사용했습니다.
  - 로그인하면 기록 저장과 복습 연결을 사용할 수 있습니다.

## 6) Authenticated behavior
- [ ] 로그인 사용자는 기존처럼 답안 검토를 계속 사용할 수 있다.
- [ ] learning signal 저장 경로가 기존대로 동작한다.
- [ ] anonymous trial 메시지가 로그인 사용자 화면의 주 메시지를 가리지 않는다.

## 7) Safety
- [ ] 공식 채점/합격 판정 주장 문구가 없다.
- [ ] instructor/admin 라우트 노출이 없다.
- [ ] 새로운 외부 OCR/provider 범위 확장이 없다.

---

## 실행 로그 템플릿
- 실행 일시(UTC):
- 실행 환경(브라우저/OS):
- 테스트 계정:
- 결과 요약:
- 실패 항목/재현 단계:
- 조치 필요 사항:
