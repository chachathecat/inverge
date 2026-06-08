# Inverge Curriculum System

## Scope and verification policy

This document defines the metadata-only curriculum source of truth for learner-facing Inverge. It covers only 감정평가사 1차 and 감정평가사 2차.

Before production use, every official exam syllabus label, subject boundary, and unit taxonomy **must be verified against Q-Net/current public notice verification**. Until verified, reference data must keep `sourceStatus`, `needsOfficialVerification`, and `lastReviewedAt` fields.

Official verification pass v1 was reviewed on 2026-06-02 against public official sources: 국가법령정보센터 `감정평가 및 감정평가사에 관한 법률 시행령` 별표 1 and the Q-Net 감정평가사 public qualification page. The pass verifies only the official subject labels and statutory exam boundaries. Inverge unit labels remain internal planning metadata unless their row explicitly says otherwise, so they keep `sourceStatus: internal_mapping_needs_official_review` and `needsOfficialVerification: true`. Study tracks are also internal beta planning templates, not official curriculum claims.

No raw user OCR, raw answer, raw problem text, or copyrighted question text belongs in curriculum reference data.

### 1차 영어 official-subject exclusion

- Official 감정평가사 1차 includes 영어 in addition to the five study-operation subjects modeled by Inverge.
- Inverge v1 does not model 영어 as an active learning curriculum track.
- This is a product-scope exclusion, not a claim that 영어 is absent from the official exam.
- Internal units remain internal planning metadata and must not be presented as official syllabus coverage.


## Official verification metadata policy

- Top-level curriculum files may use a `sourceStatus` such as `official_supported_subjects_verified_internal_units_need_official_review_english_excluded_from_active_learning_scope` only when supported active-learning subject labels have been checked against public official sources and any official-but-excluded subject is explicitly documented as outside active curriculum scope.
- Subject rows may use `sourceStatus: official_subject_label_verified` when the subject label appears in the statutory/Q-Net public exam information.
- Unit rows must stay `sourceStatus: internal_mapping_needs_official_review` unless a future pass can safely prove the unit label itself is official public curriculum language.
- Study tracks must stay `sourceStatus: internal_planning_needs_beta_review`; durations and mixes are Inverge planning assumptions, not official exam guidance.
- `sourceReferences` stores only metadata such as public source label, URL, review date, and verification scope. It must never store excerpts, paid materials, raw OCR, raw answer, raw problem text, or copyrighted question text.

## 1차 curriculum map

### 민법

- 민법총칙
- 권리주체와 권리객체
- 법률행위
- 의사표시
- 대리
- 무효와 취소
- 조건과 기한
- 기간과 소멸시효
- 물권법 총론
- 점유권, 소유권, 용익물권, 담보물권

### 경제학원론

- 수요·공급과 시장균형
- 소비자이론
- 생산자이론
- 시장구조
- 요소시장
- 국민소득과 거시지표
- 화폐와 금융
- 경기변동과 경제정책
- 국제무역과 국제금융

### 부동산학원론

- 부동산학 기초
- 부동산 경제론
- 부동산 시장론
- 부동산 정책론
- 부동산 투자론
- 부동산 금융론
- 부동산 개발·관리·마케팅
- 감정평가 기초

### 감정평가관계법규

- 국토계획 및 이용 관련 법령
- 부동산 가격공시 관련 법령
- 감정평가 및 감정평가사 관련 법령
- 공익사업 보상 관련 법령
- 부동산 등기·공시 관련 법령
- 기타 감정평가 업무 관련 법령

### 회계학

- 재무회계 기초
- 자산 회계
- 부채 회계
- 자본 회계
- 수익·비용 인식
- 재무제표 작성과 분석
- 원가회계 기초
- 관리회계 기초
- 재고자산과 저가법

## 2차 curriculum map

### 감정평가실무

- 평가 3방식 개요
- 원가방식
- 비교방식
- 수익방식
- 토지·건물·구분소유 평가
- 임대료 평가
- 특수물건 평가
- 보상평가
- 계산 과정, 단위, 기준시점, CASIO 검산

### 감정평가이론

- 감정평가의 본질과 기능
- 가치이론
- 가격제 원칙
- 시장분석
- 3방식 이론
- 최유효이용
- 공시·보상·담보·과세 평가 이슈
- 논점 비교와 결론 구조

### 감정평가 및 보상법규

- 감정평가법 체계
- 감정평가사와 감정평가법인
- 토지보상법 총칙
- 사업인정
- 손실보상 원칙
- 수용과 사용 절차
- 이의·행정쟁송
- 판례 기반 요건·효과·절차 정리

## Concept node structure

Each concept node should be metadata-only and include:

- `id`: stable internal identifier
- `examMode`: `first` or `second`
- `subject`: official subject label after verification
- `unit`: curriculum unit
- `concept`: concept label
- `parentId`: optional parent node
- `prerequisites`: prerequisite node IDs
- `taskTypes`: allowed task types
- `riskSignals`: confidence, wrong/unknown, 과락 risk, exam proximity, recent missed tasks
- `sourceStatus`: source tracking status
- `needsOfficialVerification`: boolean
- `lastReviewedAt`: review date

## Task type mapping

- **O/X**: best for 1차 definition, requirement, exception, and trap recognition.
- **Cloze**: best for term, condition, formula element, statute element, and comparison recall.
- **Accounting template**: best for 회계학 recognition, measurement, journal-entry logic, and repeatable calculation templates.
- **Rewrite**: best for 2차 answer structure, issue omission, requirement-application-conclusion improvement, and concise conclusion repair.
- **CASIO**: best for 감정평가실무 calculation sequence, unit handling, discount/capitalization checks, and 검산 habits.
- **Issue spotting**: best for 2차 law/theory prompt reading, 논점 후보 identification, and missing-issue prevention.

## Production guardrails

- Retrieval or production should precede explanation by default.
- One concept node should map to a clear next task, not a cluttered dashboard.
- If more than three primary actions compete, Today Plan must reduce them to max three.
- Curriculum data is a benchmark for future engines, not a UI change in this PR.

## Appraiser curriculum kernel v1 addendum

Inverge is not a question archive. The curriculum kernel is a metadata-only operating standard for turning learner traces into next actions: capture → diagnose → explain → practice → schedule → adapt.

- 20-year past papers are reference metadata, not the product front door.
- Capture-to-Note is the front door: a learner starts from their own captured note, result, or answer trace, then Inverge maps that trace to a stable curriculum node.
- Curriculum nodes are the basis for Today Plan, Review Queue, O/X, cloze, calculation, and rewrite tasks.
- Raw user OCR/problem/answer text must remain user-owned service data. Derived metadata/signals may drive product behavior when sanitized and detached from raw private text.
- All nodes are draft metadata until official syllabus/current public notice verification is checked against Q-Net or other public official sources before production use.

## PR #339 helper-level Capture-to-Plan integration

PR #339 wires the appraiser curriculum kernel into the learner Capture → Note → Explanation → Review Queue → Today Plan loop at helper level.

- `buildCurriculumAnchoredCaptureSignal` maps sanitized capture summaries to 1차/2차 curriculum candidates and keeps `metadataOnly: true` in shared outputs.
- The helper may use learner-owned capture text as input for matching, but raw learner OCR/problem/answer/source/copyright text stays in user-owned service surfaces and is not emitted in Today Plan or Review Queue candidates.
- First-mode captures map only to first-mode curriculum nodes; second-mode captures map only to second-mode nodes, with subject-aware preferences for 법규 legal issue/rewrite, 실무 calculation/CASIO only when calculation-like, and 이론 keyword/logic work.
- This is not a production durable rollout. It does not enable durable production reads/writes, public archive UI, payment, notifications, native behavior, or new exams.
- The integration keeps official-verification language separate from learner claims: no official grading, score, pass/fail, official model answer, or 합격 보장 copy.

## PR #340 personal learning state layer

PR #340 adds a deterministic, curriculum-anchored personal learning state engine at helper level. The learner loop now has a metadata-only bridge from “this capture maps to a curriculum node” to “this learner’s concept state changed because of a capture, review, rewrite, or session result.”

- Concept state uses only metadata: `userId`, `conceptNodeId`, `examMode`, `subject`, prior/next status, reason, priority/confidence deltas, review pattern, and a candidate next review time.
- Supported statuses are `unknown`, `confused`, `wrong`, `confident_wrong`, `recovering`, and `stable`.
- State transitions are not official grading, score prediction, pass/fail judgment, official model answers, or 합격 보장. They are operational learning signals for deciding the next retrieval, rewrite, OCR confirmation, or scheduled review.
- The learner owns raw text. Raw OCR/problem/answer/source/copyright text must remain in user-owned service surfaces and must not be stored in the reference corpus or emitted in state update candidates.
- Capture signals may include `learningStateUpdateCandidate` only as metadata. Unsupported exam modes or unmatched nodes keep `safeFallbackReason` and do not throw.
- Today Plan and Review Queue may use concept state risk for priority: `confident_wrong` outranks `wrong`, `wrong` outranks `confused`, due `recovering` work outranks generic new study, and `stable` remains lower priority unless due.
- OCR confirmation pending must schedule OCR confirmation before concept practice and must not mark the concept as `stable`.
- This remains helper-level and metadata-only; it does not enable production durable reads/writes by default.

## PR #342 adaptive planner curriculum usage

PR #342 uses the Appraiser Curriculum Kernel as planning metadata for adaptive study scheduling.

- Curriculum nodes provide safe metadata such as subject/unit identifiers, allowed task types, importance, risk level, and default review pattern.
- Personal learning state supplies concept status (`confident_wrong`, `wrong`, `confused`, `recovering`, `stable`) and due review dates.
- The adaptive planner combines state + curriculum metadata to produce derived Today Plan action summaries, not raw OCR/problem/answer/source/copyright text.
- The visible Today Plan remains max 3 and keeps 1차/2차 separated.
- Weekly preview includes max 3 focus lines plus target concepts, recovery items, and estimated minutes. It is metadata-only and sends no notifications.
- Missed reviews create calm recovery items and never shame the learner.
- Production durable personal learning state rollout remains gated and is not enabled by default.
