import { listUnits } from "../../curriculum-reference";
import type { PrivateFirstStageCatalog, PrivateSessionHistory } from "./session-service";

// Source-position accounting, not an official detailed syllabus or answer bank.
// AI visual observation of the already-held paper/key; no source bodies here.
export const ECONOMICS_SOURCE_ACCOUNTING = Object.freeze({
  version: "issue883-economics-position-map-v1", year: 2025, round: 36, session: 1, booklet: "A",
  questionPost: "5231525", questionAttachment: "2230215",
  questionSha256: "11578508ad4f819a02a52b246ff5990a31ff283db1d6aab4d6d0e1f5cbcc06e8",
  keyPost: "5246129", keyAttachment: "2243629",
  keySha256: "527748ba443c6aff63bafc00fda2873c2f07696e424570f96ac4309f8f419719",
  complete200KeyObservationSha256: "f91cbf0dd502bed84dda3a3b77cddb93070b11c6e913074c1acde20849bddd3f",
  rightsObservationSha256: "e90cff0144a092359e5d82bf56d624f1430928f26a73bbe9fe926e014e539269",
  keyBookletExplicit: null, sourceBookletExplicit: true, rightsObserved: "KOGL_TYPE_1_EACH_POST",
  attachmentApplicabilityHumanReviewed: false, humanReviewedCount: 0, positions: 40,
  topicMapping: "editorial-not-official", sourceObservation: "AI-visual-not-human",
});
// Each row accounts for one and only one observed position. Not-prepared means
// unfinished validator/content work, never a fabricated source-based exclusion.
const POSITIONS = [
  [41,"econ_supply_demand","elasticity_expenditure","수요 탄력성과 지출","탄력성·지출 항등식 검증 미구현"],
  [42,"econ_consumer","endowment_consumer","현물 부존과 소비자 선택","대체효과·부존 소득효과 구분 미구현"],
  [43,"econ_supply_demand","coase_conditions","코즈 정리의 조건","진술·거래비용 조건 검증 미구현"],
  [44,"econ_producer","ppf_opportunity_cost","생산가능곡선과 기회비용","곡선·내외부 점의 의미 검증 미구현"],
  [45,"econ_supply_demand","market_failure","시장실패의 유형","외부효과·공공재·정보 조건 검증 미구현"],
  [46,"econ_producer","fixed_proportion_monopoly","고정비율 생산·독점 최적량","기존 r3 검산·별도 재시도"],
  [47,"econ_consumer","piecewise_preferences","구간별 선호와 소비 최적화","구간별 MRS·예산 검증 미구현"],
  [48,"econ_supply_demand","related_goods_equilibrium","연관재와 시장균형","대체재·보완재 이동 방향 검증 미구현"],
  [49,"econ_producer","stackelberg","선도자·추종자 균형","기존 r3 검산·별도 재시도"],
  [50,"econ_producer","price_discrimination","가격차별","공식 최종정답 전 선지 인정: 단일정답 재고 제외"],
  [51,"econ_producer","cartel_deviation","담합과 일방 이탈","기존 r3 검산·별도 재시도"],
  [52,"econ_producer","homogeneity_cost","동차성과 장기비용","Owner 제외 유지: 52/r52 사용 불가"],
  [53,"econ_supply_demand","pigouvian_tax","외부비용과 피구세","기존 r3 정규화 전사·검산·별도 재시도"],
  [54,"econ_producer","rent_transfer_earnings","경제적 지대와 이전수입","요소 탄력성·용어 검증 미구현"],
  [55,"econ_producer","nash_best_response","최적반응과 내시균형","보수행렬 검증·후보 미준비"],
  [56,"econ_consumer","perfect_complements","완전보완재와 탄력성","양의 가격·함수·부호 검증 미구현"],
  [57,"econ_supply_demand","asymmetric_information","비대칭정보","역선택·도덕적 해이 구분 미구현"],
  [58,"econ_supply_demand","price_ceiling_transfer","가격상한과 잉여 이전","새 제한 표본: 선형균형·거래량·이전 면적"],
  [59,"econ_supply_demand","public_private_aggregation","공공재·사적재 수요 합산","수직·수평 합산과 음수 구간 검증 미구현"],
  [60,"econ_supply_demand","linear_demand_revenue","선형 수요와 총수입","중점·탄력성·이동 방향 검증 미구현"],
  [61,"econ_money_policy","liquidity_lm","유동성 선호와 LM","곡선 이동·곡선상 이동 구분 미구현"],
  [62,"econ_money_policy","money_velocity","화폐수요와 유통속도","새 제한 표본: 명목 화폐수요·비율·역수"],
  [63,"econ_money_policy","is_lm_money","IS-LM과 통화 변화","연립식 검증·후보 미준비"],
  [64,"econ_macro","aggregate_demand_slope","총수요곡선의 기울기","자산·이자율 효과 조건 검증 미구현"],
  [65,"econ_macro","separate_fiscal_multipliers","별도 재정 변화의 승수","새 제한 표본: 정부지출·조세의 별도 충격 비교"],
  [66,"econ_macro","solow_steady_state","솔로 모형의 정상상태","양의 정상상태 검증·후보 미준비"],
  [67,"econ_macro","aggregate_shifts","총수요·총공급 이동","충격 분류 검증 미구현"],
  [68,"econ_macro","stagflation","스태그플레이션","공급 충격 방향 검증 미구현"],
  [69,"econ_money_policy","mundell_fleming","먼델-플레밍 모형","공식 최종정답 전 선지 인정: 단일정답 재고 제외"],
  [70,"econ_macro","open_economy_expenditure","개방경제 지출","고정 산출·이자율 역할 검증 미구현"],
  [71,"econ_macro","ricardian_equivalence","리카도 대등정리","성립·불성립 조건 검증 미구현"],
  [72,"econ_macro","phillips","필립스곡선","축·기대·기울기 검증 미구현"],
  [73,"econ_macro","gdp_measurement","GDP 측정","비시장 생산 예외·정의 검증 미구현"],
  [74,"econ_macro","growth_theories","경제성장 이론","내생·외생 요인 구분 미구현"],
  [75,"econ_macro","income_components","국민소득 구성","총액·순액·감가상각 검증 미구현"],
  [76,"econ_macro","relative_income","상대소득 가설","가설 조건 검증 미구현"],
  [77,"econ_macro","minimum_wage_macro","최저임금과 거시균형","노동·저축·투자 동시 조건 검증 미구현"],
  [78,"econ_money_policy","seigniorage","화폐주조차익과 인플레이션 조세","실질 잔고·성장 조건 검증 미구현"],
  [79,"econ_macro","endogenous_tax","내생 조세와 균형소득","연립식·선지 방향 검증 미구현"],
  [80,"econ_producer","tobin_q","토빈의 q","시장가치·대체비용 정의 검증 미구현"],
] as const;
const PAGE_GROUPS=[[41,42,43,44],[45,46,47,48,49],[50,51,52,53,54],[55,56,57,58],[59,60,61],
  [62,63,64,65,66],[67,68,69,70],[71,72,73,74,75],[76,77,78],[79,80]];

export function projectOwnerLocalCurriculum(catalog: PrivateFirstStageCatalog, history: readonly PrivateSessionHistory[],
  unavailableQuestions: readonly string[], complete: boolean) {
  const units = listUnits("first","first_economics").map(({id,name})=>({id,name}));
  const topics = POSITIONS.map(([number,unitId,topicId,title,supportNote])=>{
    const reference=catalog.initialReferences.find(row=>row.questionNumber===number && row.questionId===`qnet-2025-36-s1-A-${number}`);
    if(!units.some(unit=>unit.id===unitId)) throw new Error("curriculum_unit_unavailable");
    const bound=reference?catalog.curriculumBinding?.(reference):null;
    if(bound && (bound.unitId!==unitId || bound.topicId!==topicId)) throw new Error("curriculum_mapping_drift");
    const questionId=`qnet-2025-36-s1-A-${number}`, rows=history.filter(row=>row.questionId===questionId);
    const assisted=rows.some(row=>row.committedAttempts.some(attempt=>attempt.assistanceLevel!=="none"));
    const observed=rows.some(row=>row.committedAttempts.length>0);
    const uncertain=!complete || unavailableQuestions.includes(questionId) || unavailableQuestions.includes("unknown");
    const excluded=[50,52,69].includes(number);
    return {number,questionId,unitId,topicId,title,supportNote,sourcePage:14+PAGE_GROUPS.findIndex(group=>group.includes(number)),
      mappingVersion:ECONOMICS_SOURCE_ACCOUNTING.version,questionVersion:reference?.questionVersion??null,
      supply:reference?"usable_unreviewed_trial":excluded?"excluded":"no_usable_supply",
      evidence:uncertain?"unavailable":assisted?"assisted_practice_observed":observed?"unreviewed_practice_observed":"no_attempt_evidence",
      selectable:Boolean(reference&&!uncertain&&!rows.length),independentPerformanceEstablished:false,
      prerequisitesAreOptional:true,conceptHelpAvailable:Boolean(reference&&catalog.conceptAidDescriptor?.(reference,"concept"))};
  });
  return {source:ECONOMICS_SOURCE_ACCOUNTING,units,topics,sourcePositionCount:40,
    usableOriginalCount:topics.filter(row=>row.supply==="usable_unreviewed_trial").length,
    noSupplyCount:topics.filter(row=>row.supply==="no_usable_supply").length,
    excludedCount:topics.filter(row=>row.supply==="excluded").length,
    humanReviewedCount:0,masteryPercentage:null,officialDetailedSyllabus:false};
}
