# Inverge Design Operating System

목표: 감정평가사 1차/2차 학습 실행에 최적화된, 차분하고 프리미엄한 저인지부하 인터페이스 기준을 제공한다.

## 1) Design North Star
Inverge experience should feel like:
- Apple clarity
- Dieter Rams restraint
- GOV.UK service simplicity
- Linear-level product order
- Things-style calm task focus
- premium Korean study room discipline

## 2) Visual Direction
- warm neutral background
- deep navy accent
- near-black navy text
- thin subtle borders
- generous spacing
- quiet cards
- restrained motion
- Korean-first typography

금지:
- loud gradients
- generic purple AI SaaS look
- over-dark dashboard tone

## 3) Ten Product Design Rules
1. One screen, one task.
2. One primary CTA per screen.
3. Score is secondary to next action.
4. Graphs live in records, not core execution flow.
5. AI copy is short, calm, operational.
6. Empty states reduce anxiety.
7. Interface must not compete with learner’s work.
8. Mobile keeps primary action above the fold.
9. Primary action is obvious but not loud.
10. Secondary actions are always available but quiet.

## 4) Primitive Catalog (Implementation-ready)
- `PageShell`: 안정적 여백/폭/헤더 구조
- `SectionHeader`: 섹션 목적 + 보조 설명(짧게)
- `QuietCard`: 저대비 카드 컨테이너
- `TodayPriorityCard`: 오늘 최우선 작업 + 이유 + 예상시간 + override
- `OneGapFeedbackCard`: 가장 큰 gap 1개 + 위치 + 즉시 수정 행동
- `RetryQueueCard`: 당일 재시도 목록
- `RewriteCTA`: 문단 재작성 주행동
- `CalmTimer`: 압박 없는 시간 기록
- `PacingIndicator`: 권장 페이스 표시
- `FocusAudioControl`: 실행화면 한정, 컴팩트 제어
- `QuietEmptyState`: 불안 완화형 빈 상태
- `SecondaryRecordPanel`: 기록/그래프 보조 패널
- `PrimaryAction`: 화면 주행동 버튼
- `SecondaryAction`: 저강도 보조 액션
- `EvidenceNote`: 권장 이유를 짧게 설명
- `RecoveryTaskCard`: 밀림 복구 최소작업 제시

## 5) Interaction and Motion
- 즉시 실행 가능한 명확한 흐름
- 상태 전환은 짧고 절제된 모션
- 피드백 후 주행동으로 자연 연결
- 경고/빨간색 남용 금지 (시험 모드 제외)

## 6) Content and Language
- Korean-first, operational copy
- 문장 길이 최소화
- “지금 할 행동”을 헤드라인에 노출
- 평가 결과보다 실행 다음 단계 우선

## 7) Accessibility and Readability
- 명도 대비 충족
- 본문 가독성 우선
- 모바일에서도 주행동 노출 보장
- 조작 가능한 컨트롤 크기 유지

## 8) Scope and Product Safety
- 감정평가사 1차/2차 외 시험 표현 금지
- 보험/계리 관련 제품 메시지 노출 금지
- 결제 우선 흐름/복잡 대시보드 유도 금지

## 9) S224U Learner Gate Rules

### CTA Hierarchy
- One major learner surface exposes one dominant primary action.
- Secondary routes such as capture, review, notes, weekly, or study log live in quiet outline buttons or collapsed `다른 작업 보기` disclosures.
- Primary action uses deep navy only; no saturated CTA gradients.

### Trust Layer
- OCR, imported text, and AI analysis are always presented as editable learning-support drafts.
- Trust copy should appear as one visible trust layer per stage, not as repeated warnings across adjacent cards.
- The trust layer must distinguish user-confirmed text, OCR/import draft, AI analysis draft, and continuation to Today Plan / Review Queue / Notes.

### Status Colors
- Muted blue: focus, trust, active mode, primary attention.
- Amber: review, due, needs learner confirmation.
- Green: saved, stable, recovered.
- Red: true failure only.
- New saturated colors require explicit product justification.

### Spacing, Radius, Typography
- Authenticated learner pages use warm canvas, white surfaces, thin borders, and no decorative gradients.
- S232A Figma V3 foundations use the exact spacing, radius, layout, and type-role tokens in `app/globals.css`.
- Use Noto Sans KR Variable for UI, Noto Serif KR Variable for learner prose/evidence, and IBM Plex Mono 500 for calculator notation.
- Use role-specific tracking from Figma Typography `44:9`; body copy remains `0`, while headings and captions use their documented V3 values.
- Keep body copy to two or three short lines on work surfaces.
- Use stable dimensions for buttons, pills, progress rows, and primary task cards.

### S232A Figma V3 Foundation Contract

- Color & Theme source: Figma `43:2`; runtime remains light-only.
- Typography source: Figma `44:9`; use `.v3-type-*`, `.v3-prose*`, and `.v3-mono-*` roles.
- Layout & Spacing source: Figma `45:2`; 20px mobile edge, 32px tablet/desktop edge, 1120px content, 680px reading column, 288px evidence rail.
- Component nodes are migrated in later S232 slices. A foundation token existing in code is not evidence of component-level parity.

### Mobile and Focus
- Interactive controls should meet a 44px minimum target.
- Keyboard focus uses a visible navy focus ring.
- Mobile layouts keep the primary action available before secondary diagnostics.

## Short References (non-quoted)
- Apple Human Interface Guidelines
- Nielsen Norman usability heuristics
- GOV.UK Design Principles
