---
document_title: "답안길 감정평가사 Official Coverage Compiler & Original Question Engine v1"
document_subtitle: "공식 범위·현행 기준·전 기출·선행개념을 원자화하고 독창 문제로 무도움 전이까지 검증하는 1차·2차 전범위 콘텐츠 엔진"
document_role: "final master plan v12의 mandatory appraiser coverage and content-generation specification"
status: "owner-strategy/non-authoritative"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
owner_decision: "docs/decisions/2026-08-06-owner-appraiser-coverage-and-original-question-engine.md"
machine_contract: "config/dabangil-appraiser-coverage-engine-v1.json"
strategy_coverage_scope: "감정평가사 제1차 5개 과목과 제2차 3개 과목"
current_runtime_scope: "기존 권위상 제2차 3과목 only; 제1차 runtime activation none"
real_third_party_source_authorization: "none"
production_authorization: "none"
execution_rule: "This specification proposes the complete compiler, graph, generator, verifier and evidence contracts. Every implementation Work must reconcile live code, current official scope, exam-date law/accounting standards, source rights and exact authority."
research_checked_at: "2026-08-06 KST"
---

# 답안길 Official Coverage Compiler & Original Question Engine

## 공식 범위를 외우는 앱이 아니라, 공식 범위를 빠짐없이 능력으로 바꾸는 엔진

---

## 0. 한 페이지 결론

답안길의 콘텐츠는 다음 네 층으로 구성한다.

```text
Layer 1 — Official Coverage Compiler
현재 시험과목 + 공식 출제영역 + 시험일 기준 법령/회계기준 + 공식 기출
→ versioned coverage graph

Layer 2 — Original Concept Curriculum
공식 범위를 prerequisite·오개념·기술·전이 단위로 원자화
→ 독립 설명·예제·암기·표·계산·답안 구조

Layer 3 — Synthetic Question Engine
concept graph + difficulty + misconception policy
→ 완전히 새로운 사실관계·수치·선택지·사례·논술문제
→ solver/validator/critic 통과 후 release

Layer 4 — Private Ephemeral Book Tutor
사용자가 가진 문제를 한 job씩 일시 분석
→ concept/error signature만 개인 학습상태에 연결
→ graph에서 새 변형문제로 transfer 확인
```

`완벽한 커버`는 미래 출제를 맞힌다는 뜻이 아니다. 다음 source universe의
누락을 0으로 만드는 뜻이다.

```text
official subject coverage
+ official detailed-scope coverage
+ official past-question coverage
+ current law/accounting/standards coverage
+ prerequisite and transfer coverage
+ misconception and question-family coverage
```

---

## 1. 기존 “필수개념 목록”만으로 부족한 이유

과목별 제목을 길게 나열하는 것만으로는 실제 학습 OS가 되지 않는다.

예를 들어 `층별효용비`라는 항목 하나에는 적어도 다음이 분리돼야 한다.

```text
정의
기준 100의 의미
단가비와 배분비의 구별
면적을 곱하는 이유
호별효용비와의 합성
건물가액·토지가액의 다른 배분기준
본건/사례 지수의 분자·분모
반올림 위치
표 작성 순서
분모를 전체 효용적수로 쓰는 이유
새 구조에서의 전이
```

한 개념명 아래의 이 요소들을 분리하지 않으면 AI는 설명은 잘하지만 사용자가
정확히 무엇을 모르는지, 어떤 새 문제로 확인해야 하는지 알 수 없다.

따라서 coverage의 최소 단위는 chapter가 아니라 `claim + skill + condition +
misconception + evidence gate`다.

---

## 2. Coverage hierarchy

```text
L0 Exam
L1 Stage
L2 Subject
L3 Official domain
L4 Curriculum family
L5 Atomic concept / rule / formula / issue
L6 Skill operation
L7 Misconception / distractor / failure mode
L8 Question archetype
L9 Evidence and mastery gate
```

### 2.1 예시

```yaml
exam: appraiser
stage: second
subject: practice
official_domain: property_specific
family: sectional_property_allocation
concept: land_value_by_composite_utility_share
skill: compute_and_explain_denominator
misconception: use_subject_area_share_for_land
question_archetype: reverse_error_correction
mastery_gate: unseen_variant_d7_no_help
```

### 2.2 Coverage는 네 축으로 동시에 계산한다

```ts
type CoverageVectorV1 = {
  officialScopeCoverage: number;
  pastQuestionCoverage: number;
  prerequisiteCoverage: number;
  questionAndEvidenceCoverage: number;
};
```

한 축이라도 비어 있으면 `complete`가 아니다.

- 공식 범위 100%, 기출 mapping 40% → 불완전
- 기출 100%, 공식 범위 70% → 최근 미출제 rotation 영역 누락
- 개념 mapping 100%, 검증문제 0 → 읽기 자료일 뿐 능력검증 불가
- 문제 100%, prerequisite mapping 0 → 틀린 이유를 진단하지 못함

---

## 3. Source authority와 provenance

## 3.1 Source classes

```ts
type CoverageSourceClassV1 =
  | "current_statute_or_regulation"
  | "current_accounting_standard"
  | "current_official_exam_plan"
  | "current_exam_subject_annex"
  | "official_scope_document"
  | "official_past_question"
  | "official_final_answer"
  | "official_practice_standard"
  | "binding_case_or_authoritative_interpretation"
  | "owned_curriculum"
  | "licensed_curriculum"
  | "inferred_prerequisite"
  | "watch_material";
```

## 3.2 Precedence

```text
exam-date current law/accounting
→ current 시행령 시험과목 별표
→ current Q-Net 시행계획·정정공고
→ official detailed scope
→ official past question/final answer at its historical effective date
→ current official appraisal rules/practice standards
→ owned prerequisite and transfer curriculum
```

## 3.3 Historical truth와 current truth를 분리한다

```ts
type AuthoritySnapshotV1 = {
  sourceRef: string;
  sourceClass: CoverageSourceClassV1;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  examinedAt?: string;
  rightsBasis: string;
  checksum?: string;
  status: "current" | "historical" | "superseded" | "unknown";
};
```

과거 기출은 당시 법령·기준으로 정답을 보존한다. 현재 훈련문제로 재사용하면
현재 시험일 기준으로 다시 계산하고, 정답이 달라지면 `historical_only`로
표시한다.

## 3.4 Official scope HWP 처리

Owner가 제공한 `감정평가사 국가자격시험 출제영역` 문서는 다음을 공식
coverage envelope로 사용한다.

- 민법: 총칙·물권
- 경제학: 미시 7영역, 거시 8영역
- 회계학: 중급·고급, 원가·관리
- 관계법규: 법률별 영역
- 부동산학: 총론과 각론 10영역
- 실무: 기초, 물건별, 목적별, 응용
- 이론: 원리, 방식, 방식의 응용
- 법규: 공시법, 감정평가법, 토지보상법

다만 오래된 법령명은 current 시행령과 시험일 현재 법령명으로 normalize한다.
원문은 historical official source로 보존하고 normalized node에 source lineage를
남긴다.

---

## 4. Concept node contract

```ts
type AppraiserConceptNodeV1 = {
  conceptId: string;
  stage: "first" | "second" | "bridge";
  subjectId:
    | "civil_law"
    | "economics"
    | "real_estate_studies"
    | "appraisal_related_law"
    | "accounting"
    | "appraisal_practice"
    | "appraisal_theory"
    | "appraisal_compensation_law";
  officialDomainId: string;
  familyId: string;
  labelKo: string;
  parentConceptIds: string[];
  prerequisiteConceptIds: string[];
  transferTargetConceptIds: string[];
  priority: "foundation" | "recurrent" | "rotation" | "bridge" | "watch" | "retired";
  effectiveFrom?: string;
  effectiveTo?: string;
  officialScopeRefs: string[];
  authorityRefs: string[];
  pastQuestionRefs: string[];
  mustKnowClaims: string[];
  mustDoSkills: string[];
  misconceptionCodes: string[];
  questionFamilyIds: string[];
  verifierIds: string[];
  masteryGateId: string;
  rightsClass: "owned" | "official_permitted" | "metadata_only";
  releaseStatus: "draft" | "validated" | "held" | "retired";
};
```

## 4.1 필수 child dimensions

각 curriculum family는 최소한 다음 child를 갖는다.

```text
definition
classification
conditions
legal/formula basis
procedure
exception
comparison
calculation or application
common trap
reverse reasoning
transfer
exam compression
```

모든 child가 모든 concept에 필요한 것은 아니지만 `not_applicable` 근거 없이
빈칸으로 둘 수 없다.

---

# PART I — 제1차 전범위 seed map

## 5. 민법 — 총칙·물권

공식 범위는 총칙과 물권이다. 채권·친족·상속은 독립 출제범위로 승격하지
않되, 총칙·물권 문제 해석에 필요한 최소 연결만 prerequisite metadata로 둔다.

## 5.1 총칙 family

### CIV.GEN.01 민법의 기본구조

- 민법의 법원과 적용
- 신의성실·권리남용
- 권리·의무의 발생·변경·소멸
- 강행규정·임의규정·단속규정
- 사실·법률요건·법률효과

### CIV.GEN.02 자연인

- 권리능력의 시기·종기
- 태아의 권리능력 예외
- 의사능력·행위능력
- 미성년자·피성년후견인·피한정후견인
- 제한능력자 상대방의 보호
- 주소·부재·실종선고

### CIV.GEN.03 법인·비법인단체

- 법인의 설립·권리능력·불법행위능력
- 기관·대표권·정관
- 사단·재단
- 비법인사단의 재산귀속과 소송
- 법인격부인·권리능력 없는 재단 watch

### CIV.GEN.04 권리의 객체

- 물건의 의의·분류
- 동산·부동산
- 주물·종물
- 원물·과실
- 단일물·합성물·집합물

### CIV.GEN.05 법률행위 일반

- 법률행위·준법률행위·사실행위
- 성립요건·효력요건
- 법률행위 해석
- 불요식·요식행위
- 처분행위·부담행위
- 유상·무상, 단독·계약·합동행위

### CIV.GEN.06 목적과 효력

- 확정성·가능성·적법성·사회적 타당성
- 반사회질서 법률행위
- 불공정 법률행위
- 법률행위 일부무효·전환
- 강행규정 위반과 사법상 효력

### CIV.GEN.07 의사표시

- 비진의표시
- 통정허위표시와 제3자
- 착오의 유형·중요부분·중과실
- 사기·강박과 제3자
- 의사표시 효력발생·도달
- 공시송달
- 의사와 표시 불일치 비교표

### CIV.GEN.08 대리

- 대리의 요건·효과
- 대리권 발생·범위·제한·소멸
- 자기계약·쌍방대리
- 복대리
- 무권대리·추인·철회·최고
- 표현대리 각 유형
- 본인·상대방·제3자 관계

### CIV.GEN.09 무효·취소·추인

- 절대무효·상대무효
- 취소권자·취소기간
- 법정추인
- 무효행위 추인
- 취소 전후 법률관계와 제3자
- 부당이득 연결은 최소 prerequisite

### CIV.GEN.10 조건·기한·기간

- 정지·해제조건
- 가장조건·불법조건
- 조건성취 방해·촉진
- 시기·종기
- 기한이익
- 기간 계산

### CIV.GEN.11 소멸시효

- 취지·대상·기산점
- 기간
- 완성유예·갱신 사유
- 승인·재판상 청구·압류
- 완성효과·원용권자
- 포기
- 제척기간과 구별

## 5.2 물권 family

### CIV.REAL.01 물권법 총론

- 물권법정주의
- 물권의 우선적 효력
- 일물일권주의
- 물권적 청구권
- 물권의 객체·종류

### CIV.REAL.02 물권변동·공시

- 법률행위에 의한 부동산 물권변동
- 등기의 공동신청·형식적 유효요건 연결
- 동산 인도와 선의취득
- 법률규정에 의한 변동
- 중간생략등기·등기청구권
- 가등기·예고등기와의 구별

### CIV.REAL.03 점유권

- 자주·타주, 선의·악의, 직접·간접점유
- 점유의 승계·추정
- 점유자와 회복자의 관계
- 비용상환·과실·멸실훼손
- 점유보호청구권

### CIV.REAL.04 소유권·상린관계

- 소유권 내용·제한
- 상린관계
- 소유권에 기한 물권적 청구
- 주위토지통행권
- 경계·수지·공작물 관계

### CIV.REAL.05 취득시효

- 점유취득시효·등기부취득시효
- 자주점유 추정과 번복
- 시효완성 전후 제3자
- 등기청구권
- 국유재산 등 시효취득 제한

### CIV.REAL.06 공동소유

- 공유·합유·총유 비교
- 공유물 관리·보존·변경
- 지분처분·분할
- 합유물 처분·분할
- 비법인사단 총유

### CIV.REAL.07 부합·혼화·가공

- 첨부의 요건·효과
- 주종 판단
- 가공물 소유권
- 보상청구

### CIV.REAL.08 지상권

- 설정·존속기간
- 법정지상권·관습법상 법정지상권
- 지료·갱신·매수청구
- 구분지상권
- 토지·건물 권리분리 문제

### CIV.REAL.09 지역권

- 요역지·승역지
- 부종성·불가분성
- 취득·소멸
- 통행지역권

### CIV.REAL.10 전세권

- 성립·존속기간
- 사용수익·담보성
- 전세금증감·갱신
- 전세권 양도·전전세
- 소멸·전세금반환·경매청구

### CIV.REAL.11 유치권

- 견련성·변제기·점유
- 불법점유 배제
- 효력·유치권자의 권리의무
- 경매·간이변제충당
- 부동산경매와 인수 쟁점

### CIV.REAL.12 질권

- 동산질권·권리질권
- 설정·효력·전질
- 물상대위
- 유질계약 금지

### CIV.REAL.13 저당권

- 피담보채권·부종성
- 효력범위
- 물상대위
- 제3취득자
- 저당권 침해와 구제
- 저당권 실행·우선변제

### CIV.REAL.14 근저당·공동저당

- 근저당의 확정
- 최고액·피담보채권 범위
- 공동저당 동시·이시배당
- 후순위자 대위
- 물상보증인·채무자 소유 부동산 관계

## 5.3 민법 question families

```text
조문형 OX
판례결론 반전형
A-B-C 제3자 보호형
요건 누락형
무효/취소/해제 비교형
등기 전후 권리귀속형
담보물권 우선순위형
사례 타임라인형
```

---

## 6. 경제학원론

## 6.1 미시경제학

### ECO.MICRO.01 수요·공급

- 수요·공급 함수와 이동/곡선상 이동
- 균형·초과수요·초과공급
- 가격규제·수량규제
- 조세·보조금 귀착

### ECO.MICRO.02 탄력성

- 가격·소득·교차탄력성
- 점·호탄력성
- 총수입과 탄력성
- 조세부담과 탄력성

### ECO.MICRO.03 소비자 선택

- 효용·한계효용
- 무차별곡선·예산선
- 한계대체율
- 내부·모서리해
- 가격효과·소득효과·대체효과
- 정상재·열등재·기펜재
- 현시선호
- 불확실성·기대효용 기초

### ECO.MICRO.04 생산이론

- 생산함수·한계생산·평균생산
- 단기·장기
- 등량곡선·기술적대체율
- 규모수익
- 비용최소화

### ECO.MICRO.05 비용이론

- 회계비용·경제비용·기회비용
- 고정·가변·총·평균·한계비용
- 단기·장기 비용곡선
- 범위의 경제·학습효과

### ECO.MICRO.06 완전경쟁

- 기업·산업 균형
- 조업중단·손익분기
- 단기·장기 공급
- 경제적 이윤과 진입퇴출

### ECO.MICRO.07 독점

- MR=MC
- 가격·수량·후생손실
- 가격차별 1·2·3급
- 자연독점·규제

### ECO.MICRO.08 독점적 경쟁·과점

- 독점적 경쟁 장단기
- Cournot·Bertrand·Stackelberg
- 담합·카르텔
- 굴절수요

### ECO.MICRO.09 게임이론

- 우월전략·열등전략
- Nash equilibrium
- 순차게임·후방귀납
- 반복게임·죄수의 딜레마
- 혼합전략 기초

### ECO.MICRO.10 생산요소시장·분배

- 노동수요·공급
- 자본·토지 요소가격
- 한계생산물가치
- 경제적 지대·준지대
- Lorenz·Gini

### ECO.MICRO.11 일반균형·후생

- Edgeworth box
- 교환·생산효율
- 후생경제학 정리
- Pareto·보상원리
- 사회후생함수

### ECO.MICRO.12 시장실패·공공경제·정보

- 외부효과·Coase·Pigou
- 공공재·공유자원
- 역선택·도덕적 해이
- 신호·선별
- 정부실패·공공선택

## 6.2 거시경제학

### ECO.MACRO.01 국민소득회계

- GDP/GNP/GNI
- 명목·실질·디플레이터
- 지출·소득·생산 접근
- 저축·투자 항등식

### ECO.MACRO.02 국민소득결정

- Keynesian cross
- 승수
- 정부·조세·대외부문
- 균형재정승수

### ECO.MACRO.03 소비·저축

- 절대소득·상대소득
- 생애주기·항상소득
- 소비의 시간선택

### ECO.MACRO.04 투자

- 자본의 한계효율
- 사용자비용
- Tobin q
- 재고·주택투자 기초

### ECO.MACRO.05 화폐·금융

- 화폐기능·수요
- 통화지표
- 은행·지급준비·통화승수
- 중앙은행 수단
- 채권가격·이자율

### ECO.MACRO.06 IS-LM

- IS·LM 도출과 이동
- 재정·통화정책
- 구축효과·유동성함정
- 고전학파·케인즈 비교

### ECO.MACRO.07 AD-AS

- 총수요 도출
- 단기·장기 총공급
- 수요·공급충격
- 정책과 산출·물가

### ECO.MACRO.08 실업·인플레이션

- 실업 종류·자연실업률
- Phillips curve
- 기대와 가속주의
- 인플레이션 비용·seigniorage

### ECO.MACRO.09 경제정책

- 정책시차·규칙대재량
- 재정 지속가능성
- 통화정책 전달경로
- Taylor rule 기초
- Ricardian equivalence

### ECO.MACRO.10 경기변동

- 승수-가속도
- 새고전·새케인즈 기초
- 실물경기변동 기초
- 경기지표

### ECO.MACRO.11 경제성장·발전

- Solow model
- 황금률
- 기술진보
- 내생성장 기초
- 발전·빈곤·불평등

### ECO.MACRO.12 국제무역

- 비교우위
- 관세·쿼터
- 무역후생
- Heckscher-Ohlin 기초

### ECO.MACRO.13 국제금융·개방경제

- 환율·구매력평가
- 이자율평가
- 국제수지
- Mundell-Fleming
- 고정·변동환율 정책효과

## 6.3 경제 verifier

- 함수·그래프·미분조건 정합
- 균형해 존재·유일성
- 정책충격 방향
- 후생합계
- 단위·부호
- 정답선택지 유일성
- 그래프와 서술의 일치

---

## 7. 부동산학원론

### RE.GEN.01 부동산의 개념·분류

- 물리적·경제적·법률적 개념
- 토지·정착물·준부동산
- 복합부동산
- 동산/부동산 비교

### RE.GEN.02 부동산 특성

- 부동성·영속성·부증성·개별성
- 용도의 다양성·병합분할 가능성
- 위치·인접·환경 의존성
- 특성이 시장·정책·평가에 미치는 효과

### RE.ECON.01 부동산경제

- 수요·공급·탄력성
- 지대·지가 이론
- 도시성장·토지이용
- 경제기반·승수
- 부동산 경기변동

### RE.MARKET.01 부동산시장

- 시장의 지역성·비표준성·정보비대칭
- 시장분석·시장세분
- 효율적 시장과 한계
- 주택·토지·상업용 시장

### RE.POLICY.01 부동산정책

- 시장실패와 정부개입
- 토지·주택정책
- 가격·거래·공급 규제
- 조세·보조금·금융규제
- 정책효과와 부작용

### RE.INVEST.01 화폐시간가치

- 단리·복리
- 현재가치·미래가치
- 연금·영구연금
- 명목·실질수익률

### RE.INVEST.02 투자분석

- NOI·BTCF·ATCF
- NPV·IRR·PI·회수기간
- 위험·수익
- 민감도·시나리오
- 레버리지
- 포트폴리오

### RE.FIN.01 저당금융

- 원금균등·원리금균등·체증식
- LTV·DSR 기초
- 고정·변동금리
- 조기상환·재융자
- 잔금·상환표

### RE.FIN.02 유동화·간접투자

- MBS
- REITs
- 부동산펀드
- PF
- 신탁·유동화 구조

### RE.DEV.01 개발

- 개발과정
- 입지·시장·재무타당성
- 잔여법·최대지불가격
- 위험·금융·공공개발

### RE.MGMT.01 관리

- 시설·임대·자산관리
- 유지보수·생애주기비용
- 임대차 운영
- 마케팅·포트폴리오

### RE.BROKER.01 중개

- 중개시장·정보·계약 기초
- 중개보수·윤리 개념
- 거래과정과 위험

### RE.TAX.01 조세

- 취득·보유·양도 단계
- 조세의 자본화·귀착
- 조세와 투자·시장효과
- 세율 숫자는 currentness gate

### RE.RIGHTS.01 권리분석

- 공시자료
- 권리순위
- 임대차·담보·법정권리
- 경매·공매 기초
- 하자·위험분석

### RE.APPRAISAL.01 감정평가 기초

- 가치·가격·원가
- 가치형성요인·가격원칙
- 비교·원가·수익 접근
- 최유효이용
- 1차→2차 bridge

---

## 8. 감정평가 관계 법규

시험일 현재 시행 중인 법률·시행령·시행규칙을 source of truth로 한다.
숫자·기간·권한자·절차·예외는 effective-date binding 없이는 release하지 않는다.

## 8.1 국토의 계획 및 이용에 관한 법률

- 국토계획 체계
- 광역도시계획
- 도시·군기본계획
- 도시·군관리계획
- 용도지역·지구·구역
- 도시·군계획시설
- 지구단위계획
- 개발행위허가
- 기반시설·개발밀도
- 토지거래허가
- 비용부담·실효·매수청구

## 8.2 감정평가 및 감정평가사에 관한 법률

- 정의·업무
- 감정평가 의뢰·추천
- 감정평가서
- 자격·등록·사무소
- 감정평가법인
- 성실·독립·비밀·금지행위
- 교육연수·적정성 검토
- 손해배상·징계·과징금·감독
- 협회·벌칙·과태료

## 8.3 부동산 가격공시에 관한 법률

- 표준지공시지가
- 개별공시지가
- 표준주택가격
- 개별주택가격
- 공동주택가격
- 비주거용 공시 watch/currentness
- 조사·산정·검증
- 위원회·열람·의견·이의·정정

## 8.4 국유재산법

- 국유재산 범위·분류
- 취득·관리전환
- 행정재산 사용허가
- 일반재산 대부·매각·교환
- 처분제한·가격·기간
- 무단점유·변상금
- 보호·관리기관·회계

## 8.5 건축법

- 건축물·건축·대수선·용도변경
- 허가·신고·변경
- 대지·도로·건축선
- 건폐율·용적률
- 높이·일조·구조·피난
- 사용승인
- 위반건축물·시정명령·이행강제금
- 건축위원회·특례

## 8.6 공간정보의 구축 및 관리 등에 관한 법률 중 지적

- 토지등록·지목
- 경계·면적
- 지적공부
- 토지이동
- 등록전환·분할·합병·지목변경
- 축척변경·지적재조사 연결
- 지적측량·성과검사
- 등록사항 정정

## 8.7 부동산등기법

- 등기대상·종류·효력
- 등기소·등기관·등기부
- 신청주의·공동신청·단독신청
- 신청정보·첨부정보
- 소유권보존·이전
- 용익·담보물권 등기
- 가등기
- 변경·경정·말소·회복
- 구분건물·대지권
- 이의·관할·전자신청

## 8.8 동산·채권 등의 담보에 관한 법률

- 적용대상·설정자
- 동산담보권·채권담보권
- 담보등기
- 효력·범위·존속
- 우선순위·선의취득 관계
- 실행·배당
- 변경·말소

## 8.9 도시 및 주거환경정비법

- 정비기본계획·정비계획·구역
- 추진위원회·조합
- 사업시행자
- 사업시행계획
- 분양신청
- 관리처분계획
- 수용·사용
- 이전고시·청산
- 재건축·재개발 특수쟁점

## 8.10 법규 문제 generator dimensions

```text
권한자 바꾸기
기간 하루/한 달 바꾸기
원칙과 예외 뒤집기
허가/신고/협의 바꾸기
할 수 있다/하여야 한다 바꾸기
법률/시행령/시행규칙 위계 바꾸기
효력발생시점 바꾸기
대상·면제·특례 바꾸기
```

오답은 임의 문구가 아니라 exact current provision에서 한 요소만 변형하고,
validator가 원조문·변형점·정답 근거를 보유한다.

---

## 9. 회계학

시험일 현재 적용되는 K-IFRS를 기준으로 하고 current standards registry가
unknown이면 해당 node 문제를 release하지 않는다.

## 9.1 재무회계 — 중급

- 재무보고 개념체계
- 재무제표 표시·측정·인식
- 현금·현금성자산
- 매출채권·대손
- 재고자산
- 유형자산
- 차입원가
- 투자부동산
- 무형자산
- 자산손상
- 금융자산·금융부채
- 사채·상환·유효이자율
- 충당부채·우발사항
- 종업원급여 기초
- 자본·주식·자기주식
- 수익인식
- 리스
- 법인세회계
- 주당이익
- 현금흐름표
- 회계정책·추정·오류
- 보고기간후사건
- 외화환산

## 9.2 재무회계 — 고급

- 사업결합
- 연결재무제표
- 내부거래 제거
- 비지배지분
- 지분법
- 공동약정
- 파생상품·위험회피 기초
- 해외사업장 환산
- 합병·분할 기초

## 9.3 원가회계

- 원가개념·분류·흐름
- 제조원가명세·원가배부
- 개별원가계산
- 종합원가계산
- 결합원가·부산물
- 정상원가계산
- 활동기준원가
- 변동원가·전부원가
- 표준원가·차이분석
- 품질원가·수명주기원가 watch

## 9.4 관리회계

- CVP
- 관련원가·특별주문·자가제조
- 제품배합·제약자원
- 가격결정
- 자본예산
- 종합예산·현금예산
- 책임회계
- 성과평가·ROI·RI
- 이전가격
- 불확실성 의사결정

## 9.5 회계 verifier

```text
분개 양변 일치
재무상태표·손익·현금흐름 연결
기초+증가-감소=기말 roll-forward
세전/세후·명목/현재가치 정합
연결 elimination 양방향
원가 흐름·배부 합계
정답 유일성
시험일 적용 기준서
```

---

# PART II — 제2차 전범위 seed map

## 10. 감정평가실무

## 10.1 PRACTICE.BASE — 공통 평가 프레임

- 평가목적
- 의뢰인·이용자
- 대상물건·권리·물적 범위
- 기준시점
- 가치기준·가격종류
- 평가조건·가정·제한
- 자료의 조사·검토·신뢰도
- 최유효이용
- 방식 선정
- 시산가액 조정
- 결정가액·반올림·단위
- 감정평가서 논리·검산·설명

## 10.2 PRACTICE.METHOD.COMPARISON — 비교방식

- 거래사례 선정
- 사정보정
- 시점수정
- 지역요인
- 개별요인
- 면적·단위
- 배분·비교표준지
- 임대사례비교
- 비준가액·비준임료
- 사례 배제와 신뢰도

## 10.3 PRACTICE.METHOD.COST — 원가방식

- 재조달원가·복성가격
- 직접·간접·부대비용
- 내용연수
- 정액·정률·관찰감가
- 물리·기능·경제적 감가
- 감가수정 중복 방지
- 적산가액·적산임료
- 건물·구축물·기계 기초

## 10.4 PRACTICE.METHOD.INCOME — 수익방식

- 가능총소득·유효총소득
- 공실·대손
- 운영경비
- NOI
- 직접환원
- 환원율 구성·추출
- DCF
- 할인율·성장률
- 복귀가치
- 임대료·계속임료
- 수익자료 신뢰도·민감도

## 10.5 PRACTICE.LAND — 토지

- 공시지가기준법
- 거래사례비교법
- 수익환원·개발법·잔여법
- 표준지·비교표준지
- 시점수정·지역·개별요인
- 획지·일단지·용도상 불가분
- 도로·구거·하천·공공용지
- 맹지·부정형·고저·접면
- 농지·임야
- 개발제한·공법상 제한
- 토지사용권·임대토지
- 오염·매장물 watch

## 10.6 PRACTICE.BUILDING — 건물

- 재조달원가
- 구조·용도·등급
- 내용연수·경과연수
- 감가요인
- 미완성·증축·대수선
- 무허가·위반·미등기 건물
- 철거·잔존가치
- 임대·수익 건물

## 10.7 PRACTICE.COMPLEX — 토지·건물 복합

- 일체거래 사례 분해
- 토지·건물 배분
- 잔여법
- 수익가액 배분
- 복합부동산 시산조정

## 10.8 PRACTICE.SECTIONAL — 구분소유부동산

- 대지사용권·전유·공용
- 층별효용비
- 호별효용비
- 합성효용지수
- 효용적수
- 층별효용비와 배분비 구별
- 건물 면적배분·토지 효용배분
- 지가배분율
- 사례 본건/비교 지수
- 분자·분모·반올림
- 집합건물 거래사례비교
- 원가방식·비교방식 교차검증

## 10.9 PRACTICE.RIGHTS — 권리

- 임차권·전세권
- 지상권·구분지상권
- 지역권
- 담보권 관련 평가
- 사용수익 제한
- 권리분석과 가격 영향
- 영업권·무형자산 기초
- 광업·어업·산업재산권 watch

## 10.10 PRACTICE.RENT — 임대료

- 신규임료·계속임료
- 임대사례비교
- 적산법
- 수익분석법
- 슬라이드·차액배분
- 보증금 운용이익
- 공실·관리비·조건 차이

## 10.11 PRACTICE.COMPENSATION — 보상평가

- 일반원칙·기준시점
- 토지
- 건축물·공작물
- 수목·농작물
- 분묘
- 영업손실 휴업·폐업
- 농업·축산·어업 손실
- 주거이전비·이사비
- 이주대책
- 잔여지·잔여건축물
- 사업지구 밖 손실
- 도로·구거·특수토지
- 협의·재결 단계
- 개발이익 배제·공법상 제한

## 10.12 PRACTICE.PURPOSE — 목적별

- 담보
- 경매
- 소송
- 재무보고·자산평가
- 조세·공공매입매각
- 가격공시
- 상담·자문
- 적정성 검토

## 10.13 PRACTICE.EXAM — 시험 수행기술

- 물음·배점·시간 분해
- 100분 완주
- 산식·표·단위
- 계산기 메모리
- 반올림 정합
- 결론 검산
- 백지 방지
- 25·50·100점 압축
- 오류 원인 분류

---

## 11. 감정평가이론

### THEORY.BASE.01 가치·가격·원가

- 경제적 가치
- 시장가치·비시장가치
- 가격·원가와 관계
- 가치다원론
- 기준가치와 목적

### THEORY.BASE.02 부동산·시장 특성

- 자연·인문 특성
- 시장의 지역성·비표준성
- 정보·거래비용
- 시장참여자·시장분석

### THEORY.PRINCIPLE.01 가치형성·가격원칙

- 최유효이용
- 변동·예측
- 대체·균형·기여
- 적합·경쟁
- 외부성
- 잉여생산성·수익체증/체감

### THEORY.PROCESS.01 감정평가 절차

- 문제정의
- 자료수집·분석
- 시장분석
- 최유효이용 분석
- 방식 적용
- 시산조정
- 보고·설명

### THEORY.COMPARISON.01 비교방식 이론

- 대체원리
- 유사성·비교가능성
- 사례선정·보정
- 거래사례·임대사례
- 장점·한계·자료왜곡

### THEORY.COST.01 원가방식 이론

- 대체·기여 원리
- 재조달원가
- 감가 원인·측정
- 기업가이윤
- 토지·건물 결합
- 장점·한계

### THEORY.INCOME.01 수익방식 이론

- 기대·예측 원리
- 소득·가치 관계
- 직접환원·DCF
- 환원율·할인율
- 위험·성장·복귀
- 장점·한계

### THEORY.HBU.01 최유효이용

- 법적 허용
- 물리적 가능
- 재무적 타당
- 최고생산성
- 나지·개량부동산
- 과도·부적합 이용

### THEORY.RECONCILIATION.01 시산가액 조정

- 평균이 아닌 판단
- 방식·자료 신뢰도
- 목적·물건·시장
- 민감도·불확실성
- 검토가능성

### THEORY.APPLICATION.01 물건별·목적별

- 토지·건물·복합
- 구분소유
- 임대차·권리
- 개발·특수부동산
- 담보·보상·공시·경매·소송
- 기업·무형자산 기초

### THEORY.PUBLIC.01 공시·대량평가

- 공시지가·주택가격
- 개별평가와 대량평가
- 모형·검증·형평성
- AVM·빅데이터

### THEORY.PROFESSION.01 전문직·윤리·품질

- 독립성·객관성
- 이해상충
- 설명책임
- 감정평가서 검토
- 불확실성 공시
- AI 도구와 전문가 판단 watch

## 11.1 이론 question ladder

```text
3문장 정의
5점 핵심어
10점 원리+요건
20점 비교
25점 약술
50점 비판·응용
100점 통합
```

모든 reference outline은 다음 구조 중 필요한 것을 명시한다.

```text
의의
근거/필요성
내용/요건
적용절차
장점
한계
비교
실무적용
비판/개선
결론
```

---

## 12. 감정평가 및 보상법규

## 12.1 행정법 prerequisite scaffold

공식 과목 법률은 세 법률이지만 사례답안 작성을 위해 다음 행정법 공통도구를
bridge node로 둔다.

- 법률유보·법률우위
- 신뢰보호·비례·평등·부당결부
- 기속·재량
- 행정행위 성립·효력
- 부관
- 하자·무효·취소·철회
- 하자승계
- 행정절차·이유제시·청문
- 처분성
- 원고적격
- 협의의 소익
- 피고·관할·제소기간
- 취소소송
- 무효확인·부작위위법확인
- 당사자소송
- 집행정지
- 행정심판
- 국가배상
- 손실보상

이 node들은 독립 법률 범위를 확장하는 것이 아니라 세 법률 사례를 풀기 위한
도구다.

## 12.2 부동산 가격공시에 관한 법률

- 표준지공시지가 절차·효력
- 개별공시지가 산정·검증·결정
- 표준·개별주택가격
- 공동주택가격
- 의견청취·이의신청·정정
- 공시가격의 처분성·불복
- 위원회
- 공시가격과 보상·과세·행정처분 관계

## 12.3 감정평가 및 감정평가사에 관한 법률

- 감정평가 정의·업무
- 의뢰·추천
- 감정평가서 발급·보존
- 감정평가법인등
- 성실·독립·비밀·금지행위
- 적정성 검토·타당성조사
- 징계·과징금·업무정지
- 손해배상
- 행정처분의 처분성·쟁송
- 협회·감독

## 12.4 토지보상법

- 공익사업·사업인정
- 협의취득
- 수용재결·이의재결
- 보상원칙
- 토지·건축물·지장물
- 영업·농업·축산·어업 손실
- 주거이전비·이사비
- 이주대책
- 잔여지 매수·가치하락
- 사업지구 밖 손실
- 공법상 제한·개발이익
- 환매권
- 재결취소소송
- 보상금 증감소송
- 당사자·피고·청구취지
- 재결·처분·감정평가 관계

## 12.5 법규 answer engine

```text
사실관계 timeline
→ 처분/행위 식별
→ 쟁점 후보
→ 법적 근거
→ 판례/학설 상태
→ 요건
→ 사안포섭
→ 절차·소송형식
→ 결론
```

법규 reference answer는 조문·판례를 검증한 학습용 reference이며 공식 채점
기준으로 표시하지 않는다.

---

# PART III — 1차↔2차 bridge graph

## 13. 필수 bridge

```text
민법 물권·등기·담보
→ 실무 권리평가·경매·담보
→ 법규 보상대상·권리관계

경제 수요공급·후생·지대
→ 부동산학 시장·정책
→ 이론 시장분석·가치형성

경제 금융·현재가치
→ 부동산학 투자·금융
→ 실무 수익환원·DCF

부동산학 가격원칙·최유효이용·3방식
→ 감정평가이론
→ 감정평가실무 방식선정·시산조정

회계 원가·현금흐름·금융상품
→ 실무 원가방식·기업/무형·재무보고
→ 이론 수익·원가 접근

1차 감정평가법·공시법
→ 2차 법규
→ 실무 가격공시·감정평가서

국토계획·건축·지적·등기
→ 실무 토지·건물·공법상 제한
→ 이론 최유효이용
→ 법규 보상평가 조건
```

## 13.1 Bridge mastery

1차 객관식 정답만으로 bridge를 통과시키지 않는다. 예를 들어 `환원율`은:

```text
현재가치 객관식 계산
→ NOI/가치 관계 설명
→ 직접환원 계산
→ DCF와 비교
→ 실무 25점 문제
→ 이론 25점 설명
```

까지 연결한다.

---

# PART IV — Original Question Engine

## 14. Question artifact contract

```ts
type OriginalQuestionArtifactV1 = {
  questionId: string;
  stage: "first" | "second";
  subjectId: string;
  conceptIds: string[];
  prerequisiteIds: string[];
  questionFamilyId: string;
  difficultyVector: DifficultyVectorV1;
  assistancePolicyId: string;
  sourceProvenance: "owned_concept_graph" | "official_permitted_calibration";
  sourceExpressionIncluded: false;
  effectiveAt?: string;
  stem: string;
  data?: unknown;
  options?: string[];
  answerSpec: unknown;
  solutionSpec: unknown;
  rubricSpec?: unknown;
  misconceptionBindings: string[];
  solverEvidenceRef: string;
  criticEvidenceRef: string;
  rightsScanRef: string;
  releaseStatus: "candidate" | "validated" | "held" | "released" | "retired";
};
```

## 14.1 Difficulty vector

```ts
type DifficultyVectorV1 = {
  prerequisiteDepth: 1 | 2 | 3 | 4 | 5;
  operationCount: number;
  distractorSimilarity: number;
  dataNoise: number;
  representationShift: number;
  integrationBreadth: number;
  timePressureClass: "none" | "light" | "exam" | "overload_test";
};
```

난이도를 단순 `상/중/하`로 두지 않는다. 사용자가 계산은 되지만 표를 못 만들거나,
정의는 알지만 representation이 바뀌면 틀리는 문제를 구분해야 한다.

## 15. 제1차 문제 families

```text
F1 definition discrimination
F2 exact-rule true/false
F3 one-variable calculation
F4 graph/statement matching
F5 condition-exception
F6 A-B-C legal relation
F7 two-concept integration
F8 misconception-targeted distractor
F9 reverse question
F10 timed mixed set
F11 law/accounting drift check
F12 confidence calibration
```

### 15.1 선택지 생성 원칙

- distractor는 해당 concept의 실제 오개념에서 만든다.
- 모든 선택지는 문법·길이·형식상 정답 단서를 주지 않는다.
- `모두/항상/반드시` 같은 표면 단어만으로 풀 수 없게 한다.
- 틀린 선택지는 정확히 어느 요건·수치·방향을 바꿨는지 기록한다.
- 복수 정답 가능성이 있으면 release하지 않는다.

## 16. 제2차 실무 문제 families

```text
P1 formula recall
P2 single calculation
P3 table completion
P4 missing-data inference
P5 wrong-solution diagnosis
P6 reverse calculation
P7 method selection
P8 25-point micro case
P9 50-point mixed case
P10 100-point full case
P11 changed-assumption transfer
P12 time-compression drill
```

### 16.1 계산 생성은 constraint-first

숫자를 임의로 뽑은 뒤 답을 맞추지 않는다.

```text
학습목표
→ 원하는 정답구조
→ 제약식
→ solvable parameter generation
→ independent recomputation
→ rounding audit
→ distractor derivation
```

### 16.2 표·그림

표는 답안길 소유의 canonical schema에서 렌더링한다. 제3자 교재의 행·열 순서나
특이한 표를 복원하지 않는다.

## 17. 제2차 이론 문제 families

```text
T1 definition
T2 why-chain
T3 principle-to-method
T4 compare/contrast
T5 limitation/critique
T6 property application
T7 purpose application
T8 current issue with bounded sources
T9 25-point outline
T10 50-point answer
T11 100-point integration
T12 repair/rewrite
```

## 18. 제2차 법규 문제 families

```text
L1 single issue spotting
L2 provision/case distinction
L3 procedure timeline
L4 standing/action form
L5 outline only
L6 application paragraph only
L7 wrong-answer correction
L8 multi-party multi-issue
L9 25-point case
L10 50-point case
L11 100-point integration
L12 law-amendment delta
```

---

## 19. Generator separation

```text
Planner
→ target concept/skill/misconception/difficulty

Generator
→ candidate stem/data/options/reference

Deterministic solver
→ numerical/logical/legal answer

Adversarial critic
→ ambiguity, shortcut, leakage, realism, rights

Release gateway
→ exact policy and evidence check
```

같은 모델의 자기검토 하나로 release하지 않는다.

## 19.1 Subject-specific verifier IDs

```text
civil_relation_solver
micro_equilibrium_solver
macro_identity_solver
real_estate_finance_solver
current_statute_assertion_solver
kifrs_rollforward_solver
practice_valuation_solver
theory_rubric_coverage_validator
admin_law_issue_action_validator
copyright_non_reconstruction_validator
```

---

## 20. Official past-question calibration

## 20.1 목적

공식 기출은 다음을 교정한다.

- 질문동사
- 문항·배점 구조
- 필요한 데이터량
- 오답 선택지의 난도
- 개념 조합
- 답안분량
- 시간압박
- 법령·기준 적용시점

기출을 그대로 대량 변형해 새 문제라고 부르기 위한 corpus가 아니다.

## 20.2 Mapping contract

```ts
type PastQuestionMappingV1 = {
  officialQuestionRef: string;
  examYear: number;
  stage: "first" | "second";
  subjectId: string;
  itemNo: string;
  effectiveAt: string;
  conceptIds: string[];
  skillIds: string[];
  misconceptionIds: string[];
  questionFamilyIds: string[];
  difficultyVector: DifficultyVectorV1;
  rightsBasis: string;
  attributionRequired: boolean;
  currentAnswerStatus: "same" | "changed" | "needs_review";
};
```

## 20.3 Coverage gap report

매 ingest 후 자동 생성한다.

```text
공식 범위인데 기출 mapping 0인 rotation 영역
기출에는 있는데 concept node가 없는 영역
현행법 개정으로 과거정답이 달라진 문항
한 concept에 문제형식이 한 종류뿐인 영역
오답원인 데이터가 없는 고빈도 영역
2차 전이문제가 없는 1차 bridge 영역
```

---

# PART V — 학습 운영

## 21. Learning ladder

```text
Orient
→ Commit
→ Attempt
→ Minimal scaffold
→ Repair
→ Near transfer
→ Far transfer
→ D+1 recovery
→ D+7 unseen transfer
→ timed integration
```

## 21.1 Stage별 evidence

### 1차

- 맞혔는가
- 이유를 설명했는가
- distractor가 왜 틀렸는가
- 같은 개념의 표현변환에서 맞혔는가
- mixed set에서 시간 내 유지되는가

### 2차 실무

- 산식·표·단위
- 계산 정확성
- 방법선정
- 검산
- 시간
- 누락
- 새 숫자·새 구조 전이

### 2차 이론

- 핵심어
- 논리순서
- 비교·비판
- 실무 연결
- 분량·시간
- 무도움 재작성

### 2차 법규

- 쟁점발견
- 근거
- 판례상태
- 소송형식
- 포섭
- 결론
- 시간·누락

## 21.2 Mastery states

```text
unseen
exposed
recognized
explained
applied_assisted
applied_independent
transferred_near
transferred_far
recovered_d7
integrated_timed
stale
```

`exposed`나 `AI 답안 열람`은 성취가 아니다.

## 22. Adaptive scheduler

우선순위 함수는 다음을 조합한다.

```text
prerequisite blockage
× official priority
× exam proximity
× forgetting risk
× error severity
× transfer deficit
× time cost
× subject balance
```

오늘의 주 작업은 최대 3개다. 생성기가 무한히 문제를 만들 수 있어도 UI가
무한 과제를 밀어내지 않는다.

## 22.1 문제 선택 정책

```text
40% prerequisite/foundation repair
25% current weak concept
15% mixed cumulative
10% far transfer
10% confidence calibration / law drift
```

비율은 초기 정책이며 dogfood evidence로 조정한다. mastery 모델 fitting이나
learner data 학습은 별도 권위 없이는 수행하지 않는다.

---

# PART VI — Private Book Tutor bridge

## 23. Book Tutor는 input adapter다

상업 교재 문제는 전범위 curriculum의 source of truth가 아니다.

```text
client-held source
→ ephemeral OCR/interpretation
→ learner attempt
→ temporary concept candidate
→ source-scrubbed concept/error signature
→ trusted graph resolver
→ original transfer problem
→ evidence ledger
```

## 23.1 저장 가능한 signature 예시

```json
{
  "subjectId": "appraisal_practice",
  "candidateConceptIds": [
    "PRACTICE.SECTIONAL.COMPOSITE_UTILITY_INDEX",
    "PRACTICE.SECTIONAL.LAND_VALUE_ALLOCATION"
  ],
  "misconceptionCodes": [
    "CONFUSE_UNIT_INDEX_WITH_ALLOCATION_SHARE",
    "USE_SUBJECT_AREA_AS_LAND_DENOMINATOR"
  ],
  "requiredRepair": "explain_then_recalculate",
  "sourceExpressionPresent": false
}
```

## 23.2 공용 graph 승격 금지

user transient source에서 발견한 unknown concept는 자동으로 새 공용 concept가
되지 않는다.

```text
private candidate
→ human/source research
→ official/owned evidence
→ independent definition
→ rights scan
→ validator
→ separate release
```

## 23.3 첨부 PDF형 경험에서 취할 것과 버릴 것

취할 것:

- 용어 혼동을 정확히 짚기
- `1㎡당 가치점수` 같은 쉬운 독립 비유
- 왜 곱하고 왜 전체를 분모로 쓰는지
- 계산표 순서
- 암기어
- 반복 질문에 따른 재설명
- 새 문제로 전이

버릴 것:

- `교재 기준`을 공용 curriculum의 authority로 사용
- 교재의 고유 목차·표·수치·예시답안을 장기 저장
- 같은 source-bound 완성풀이를 다른 사용자에게 반환
- 책 전체를 문제번호별 해설 DB로 조립

---

# PART VII — Currentness and drift

## 24. Law/standard drift watcher

```ts
type SourceDriftEventV1 = {
  sourceRef: string;
  detectedAt: string;
  previousEffectiveVersion: string;
  candidateVersion: string;
  affectedConceptIds: string[];
  affectedQuestionIds: string[];
  severity: "metadata" | "answer_may_change" | "answer_changed" | "scope_changed";
  automaticAction: "none" | "hold_questions" | "hold_domain" | "block_subject_release";
};
```

## 24.1 Drift triggers

- 시행령 별표 시험과목 변경
- Q-Net 정정공고
- 법률·시행령·시행규칙 개정
- 감정평가 실무기준 개정
- K-IFRS 시행 기준 변경
- 판례 변경·전원합의체·법률개정으로 전제 변경
- 공식 최종정답 변경

## 24.2 Fail closed

법규·회계 node의 effective version이 확인되지 않으면 문제를 생성해도
learner-facing release는 하지 않는다.

---

# PART VIII — Product surfaces

## 25. Coverage Map

사용자에게 방대한 ontology 전체를 관리판처럼 보여주지 않는다.

```text
과목
→ 큰 영역
→ 지금 막힌 prerequisite
→ 현재 통과 단계
→ 다음 한 행동
```

세부 provenance와 coverage audit는 Owner/admin 검토면에 둔다.

## 26. Concept Workbench

```text
짧은 정의
→ 왜 필요한가
→ 가장 쉬운 비유
→ 정확한 공식/요건
→ 흔한 오해
→ 한 문제 시도
→ 자기설명
→ 새 변형
```

## 27. Generated Problem Studio

기본 learner UI는 generator 설정판이 아니다.

- `지금 취약한 부분으로 1문제`
- `같은 개념 새 숫자`
- `한 단계 더 어렵게`
- `시험 시간으로`
- `왜 틀렸는지 확인`

같은 제한된 action rail을 제공한다.

## 28. Provenance bar

```text
범위 근거
현행 기준일
문제 유형
AI 생성 학습문제
공식 문제/공식답안 아님
검증 상태
```

공식 기출을 직접 보여주는 경우에만 exact attribution과 rights notice를 표시한다.

---

# PART IX — Metrics and gates

## 29. Coverage metrics

```ts
type CoverageDashboardV1 = {
  officialDomainTotal: number;
  officialDomainMapped: number;
  atomicConceptTotal: number;
  atomicConceptValidated: number;
  pastQuestionTotal: number;
  pastQuestionMapped: number;
  currentnessUnknown: number;
  releasedConceptWithoutQuestionFamily: number;
  releasedQuestionWithoutVerifier: number;
  bridgeWithoutTransferQuestion: number;
  rightsUnknownArtifact: number;
};
```

## 29.1 Hard gates

```text
official domain unmapped = 0
past question unmapped in selected window = 0
currentness unknown on active law/accounting = 0
released concept without authority = 0
released question without deterministic or rubric validator = 0
multiple-correct-answer defect = 0
calculation inconsistency = 0
source-expression reconstruction = 0
user transient source in shared corpus = 0
generated answer labelled official = 0
```

## 29.2 Quality metrics

- first-attempt solve rate by difficulty vector
- distractor diagnostic value
- explanation-to-transfer conversion
- D+7 recovery
- timed integration
- false mastery rate
- generated item rejection rate
- law/accounting drift turnaround
- source-rights rejection rate

점수예측·합격확률은 별도 승인된 evidence model 없이는 learner-facing으로
생성하지 않는다.

---

# PART X — Implementation

## 30. Proposed services

```text
coverage-registry
source-authority-registry
concept-graph
past-question-mapper
question-planner
subject-generator
solver-verifier
rubric-critic
rights-reconstruction-scanner
release-gateway
mastery-projection
scheduler
book-tutor-concept-resolver
```

## 31. Proposed APIs

```http
GET /api/v1/coverage/subjects
GET /api/v1/coverage/concepts/:id
POST /api/v1/questions/plan
POST /api/v1/questions/generate
POST /api/v1/questions/validate
POST /api/v1/questions/release
POST /api/v1/attempts
POST /api/v1/repairs
POST /api/v1/transfers
POST /api/v1/book-tutor/concept-signature
```

이 문서는 API 구현을 승인하지 않는다.

## 32. Execution sequence — ACC

```text
ACC-0 Authority/source/rights freeze
ACC-1 Official scope normalizer
ACC-2 Current law/K-IFRS/practice-standard registry
ACC-3 First-stage concept seed and prerequisites
ACC-4 Second-stage concept seed and bridges
ACC-5 Historical official past-question mapper
ACC-6 Question-family templates
ACC-7 Deterministic solvers and rubric validators
ACC-8 Rights/non-reconstruction scanner
ACC-9 Mastery/evidence and scheduler adapter
ACC-10 Private Book Tutor concept resolver
ACC-11 Hostile synthetic acceptance
ACC-12 Owner-private rights-cleared dogfood
ACC-13 Separate activation decision
```

## 33. Hostile acceptance categories

### Coverage

- official leaf omitted
- duplicate concept under different names
- obsolete statute normalized as current
- current law node with old answer
- past question mapped to wrong concept
- bridge prerequisite missing

### Generation

- two correct options
- no correct option
- impossible data
- negative quantity without intended meaning
- unit mismatch
- rounding changes answer
- graph contradicts text
- legal timeline impossible
- rubric omits required issue

### Learning

- answer exposure counted as mastery
- same template memorization counted as transfer
- D+7 uses near-identical numbers
- timed integration bypasses prerequisites
- scheduler floods more than three primary tasks

### Rights

- commercial source sentence appears in generated stem
- source table layout reproduced
- user upload becomes shared example
- problem-number answer cache appears
- official question displayed without attribution

### Currentness

- Q-Net correction ignored
- law effective date unknown
- K-IFRS pending exposure treated as current
- past question historical answer silently overwritten

---

## 34. Release evidence pack

각 subject release는 다음을 묶는다.

```text
source manifest
coverage report
concept count and unresolved gaps
past-question mapping report
currentness report
question-family inventory
solver/verifier results
rights scan
held-out transfer evidence
known limitations
rollback/hold procedure
```

## 35. No silent completeness claim

UI와 marketing에서 다음 표현을 금지한다.

```text
무조건 출제
100% 적중
이것만 보면 합격
공식 모범답안
공식 채점기준
완벽한 합격예측
```

허용되는 표현은 실제 gate가 통과한 범위에서 다음과 같다.

```text
공식 출제영역을 빠짐없이 매핑한 학습지도
공식 기출 형식을 반영해 독립적으로 만든 문제
현행 기준일이 표시된 학습 콘텐츠
AI 생성 학습용 reference answer
```

---

## 36. Official-source checkpoint — 2026-08-06

### 시험 권위

- 감정평가 및 감정평가사에 관한 법률 시행령과 별표 1 시험과목
  - https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=265547
- Q-Net 2026년도 제37회 감정평가사 국가자격시험 시행계획
  - https://www.q-net.or.kr/crf002.do?gId=60&gSite=L&id=crf00201
- Owner-provided historical official scope file
  - `감정평가사 자격시험 출제영역(등재용) (1).hwp`

### 감정평가 기준

- 감정평가 및 감정평가사에 관한 법률·시행령·시행규칙
- 감정평가에 관한 규칙
- 감정평가 실무기준, 국토교통부고시 제2023-522호
  - https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000229230

### 회계

- 한국회계기준원 시행 중 K-IFRS registry
  - https://www.kasb.or.kr/front/board/ingAccountingList.do

### 공식 기출

- Q-Net 감정평가사 기출문제 내려받기
- 각 게시물의 정확한 공공누리·출처표시 조건을 item별 manifest에 기록

이 checkpoint는 영구 authority가 아니다. 모든 시험연도 release 전에 현재
법령·시행계획·정정공고·K-IFRS·실무기준·Q-Net 게시물과 이용조건을 다시
확인한다.

---

## 37. 최종 제품 문장

> 답안길은 특정 문제집의 해설을 모아 시험을 가르치지 않는다. 공식 범위와
> 현행 기준을 원자화하고, 각 개념이 처음 보는 문제에서 실제로 작동할 때까지
> 독창적이고 검증 가능한 문제를 생성한다.

> 사용자가 가진 책은 계속 공부할 수 있다. 그러나 그 책은 답안길의 공용
> corpus가 아니라 개인 학습세션의 입력이며, 서버가 기억하는 것은 원문이
> 아니라 사용자의 독립적인 이해와 수행 evidence다.
