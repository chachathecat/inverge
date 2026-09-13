# Post-WCV-C3 제품화 source 계약 검증

상태: Issue #925 candidate  
기준 main: `b75fe81b6ab810eb4fe3b0985199d563a33e69cc` / tree
`d9a838ca4058fd178467cc448e14feffdd749753`

## 범위 영수증

이 변경은 #772/#776의 S1 문서·기계 계약·회귀 테스트만 설치한다. 새 마스터,
UI, API, DB, RLS, migration, provider, dependency, 콘텐츠 또는 runtime을 만들지
않았다. Production, 결제, 공개, 실제 사용자는 모두 false다.

## 계약 커버리지

| 계약 | 설치된 경계 |
|---|---|
| #771 | bank-first 개인 생성은 post-trial 별도 경로, private body 공유 금지 |
| #773 | 3단계 도움, exposure-first, 3과목 권위, cache-first, 10초 확인 의미 |
| #774 | Standard 기본, Gameful opt-in, Low-Stimulation 동등 기능, 학습 진실 불변 |
| #775 | 1차 5과목과 timed/combined Today 순서 보존, 맞힌 클릭≠숙달 |

## 위험 점검

- 첫 화면 금지 ID와 `완전 정복` 같은 과장 표현을 닫힌 목록으로 검증한다.
- 공개 접근을 권리로 보지 않으며 개인 입력 본문은 공유·분석·생성·training에서
  제외한다.
- 실무 결정론, 이론 목표 범위, 법규 출처·시행 버전이 모델보다 우선한다.
- 카드 열기, 표시 모드, 즉시 생성은 독립 지연 증거나 숙달을 만들지 않는다.
- keyboard, screen reader, 200% reflow, 390/768/1440 경계를 source에 고정한다.
- 1차 공식 시간표는 제1교시 120문항/120분, 제2교시 80문항/80분으로 검증한다.
- source 계층은 기존 저장소 권한 순서를 보존하며, live GitHub는 구현 상태의
  사실만 결정한다.
- AI 학습용 기준안은 출처·검증·불확실성을 표시하고 법규 출처·계산·미해결 합의
  차단 중에는 공개하지 않는다.
- AI 기준안 공개는 독립 후보 3개 이상, 과목 검증, critic, 합의·충돌 처리,
  출처/evidence anchor와 기존 registry의 verified release 상태를 모두 요구한다.
- 검증 보고서만으로 공개하지 않고 canonical package validation, 실제 release
  decision, 공개 시각, 비공식 주의문과 허용된 권리 상태까지 함께 요구한다.
- 1차 `ULC-F1`에서 `WCV-C3 + S241A → ULC-M1 → ULC-M2 → ULC-K1` 선과
  독립 `S238B` 선이 합류하는 dependency graph를 보존한다.

## 검증 명령

- `node --test tests/dabangil-post-wcv-c3-productization-contract.test.mjs`
- `npm test -- --workers=1`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

## 로컬 후보 결과

- 집중 계약: 7/7 pass
- 전체 Node suite: 1,849개 중 1,844 pass. 실패 5개는 이 source 변경의
  assertion이 아니라 로컬 Playwright executable 미설치 4개와 promisor clone의
  누락 object 1개다. native CI의 clean checkout/browser 실행으로 다시 확인한다.
- typecheck: pass
- lint: 0 error, 기존 12 warning
- build: pass, 기존 broad filesystem tracing warning 6개
- JSON parse와 `git diff --check`: pass

exact head/tree, native CI와 독립 review는 GitHub 후보가 생긴 뒤 기록한다. 과거
head의 결과는 재사용하지 않는다.
