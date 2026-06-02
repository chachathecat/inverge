# Inverge Curriculum System

## Scope and verification policy

This document defines the metadata-only curriculum source of truth for learner-facing Inverge. It covers only 감정평가사 1차 and 감정평가사 2차.

Before production use, every official exam syllabus label, subject boundary, and unit taxonomy **must be verified against Q-Net/current public notice verification**. Until verified, reference data must keep `sourceStatus`, `needsOfficialVerification`, and `lastReviewedAt` fields.

Official verification pass v1 was reviewed on 2026-06-02 against public official sources: 국가법령정보센터 `감정평가 및 감정평가사에 관한 법률 시행령` 별표 1 and the Q-Net 감정평가사 public qualification page. The pass verifies only the official subject labels and statutory exam boundaries. Inverge unit labels remain internal planning metadata unless their row explicitly says otherwise, so they keep `sourceStatus: internal_mapping_needs_official_review` and `needsOfficialVerification: true`. Study tracks are also internal beta planning templates, not official curriculum claims.

No raw user OCR, raw answer, raw problem text, or copyrighted question text belongs in curriculum reference data.


## Official verification metadata policy

- Top-level curriculum files may use `sourceStatus: official_subjects_verified_internal_units_need_official_review` only when official subject labels have been checked against public official sources.
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
