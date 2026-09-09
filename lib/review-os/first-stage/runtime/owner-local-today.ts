import { buildStudyDayPlan, type DayAvailabilityV1, type LearnerConstraintProfileV1,
  type StudyTaskCandidateV1 } from "../../study-capacity-life-mode-orchestrator";
import { FirstStageKernelError, exactObject, requiredIdentifier, requiredSafeInteger, requiredUtcInstant } from "../kernel/domain";
import { activeOwnerLocalR3TrialCatalog, acceptsOwnerLocalCatalogReference, knownOwnerLocalCatalogDigest } from "./owner-local-trial-context";
import { projectOwnerLocalCurriculum } from "./owner-local-curriculum-map";
import { projectOwnerLocalRecovery } from "./owner-local-recovery";
import { createPrivateFirstStageSessionService, privateSessionDigest, privateFirstStageSessionId, type PrivateFirstStageCatalog,
  type PrivateFirstStageSessionStore, type PrivateSessionHistory } from "./session-service";

const MODE = "first_stage.owner_local_trial_session.v1" as const;
export const OWNER_LOCAL_TODAY_POLICY = "owner_local_r3_today_recovery_v2" as const;
const CAPACITY_POLICY = "dabangil.study_capacity_life_mode_orchestrator.v1";
export type TrialPlanningPreferences = {
  remainingMinutes: number; lifeMode: LearnerConstraintProfileV1["lifeMode"];
  phase: "coverage" | "recovery"; windows: DayAvailabilityV1["windows"];
};
export type TrialPlanningRecord = {
  schemaVersion: "first_stage.owner_local_planning.v1"; ownerId: string; revision: number;
  date: string; preferences: TrialPlanningPreferences; requestId: string; requestDigest: string;
  completedAtDeclaration: readonly string[];
  declaredAt?: string;
  priorDates?: readonly {date:string;preferences:TrialPlanningPreferences;declaredAt:string|null;
    requestId:string;requestDigest:string;completedAtDeclaration:readonly string[]}[];
  selectedTopic?: {topicId:string;questionId:string;questionVersion:string;mappingVersion:string;
    selectedAt:string;requestId:string;requestDigest:string}|null;
  dispatches: readonly { planId: string; action: TrialPlanAction; catalogDigest: string; date: string; availabilityDigest: string;
    block?: {startMinute:number;endMinute:number} }[];
};
export interface TrialPlanningStore {
  load(ownerId: string): Promise<TrialPlanningRecord | null>;
  save(value: TrialPlanningRecord, expectedRevision: number): Promise<boolean>;
}
export type TrialPlanAction = {
  id: string; kind: "resume" | "begin" | "retry" | "new";
  questionId: string; questionNumber: number; questionVersion: string; sessionId: string | null;
  revision: number | null; reviewTaskId: string | null; estimatedMinutes: number;
};
function fail(code: FirstStageKernelError["code"] = "invalid_input"): never { throw new FirstStageKernelError(code); }
const kst = (now: string) => new Date(Date.parse(requiredUtcInstant(now)) + 9 * 3600_000).toISOString();
const actionId = (value: Omit<TrialPlanAction,"id">) => `trial-action-${privateSessionDigest(value).slice(0,40)}`;
function profile(preferences: TrialPlanningPreferences): LearnerConstraintProfileV1 {
  return { lifeMode: preferences.lifeMode, examMode: "first", phase: preferences.phase,
    scheduleVolatility: "medium", policyVersion: CAPACITY_POLICY };
}
export function validateTrialPlanningPreferences(value: unknown, date: string): TrialPlanningPreferences {
  const row = exactObject(value, ["remainingMinutes", "lifeMode", "phase", "windows"]);
  requiredSafeInteger(row.remainingMinutes, 0, 720);
  if (row.phase !== "coverage" && row.phase !== "recovery") fail();
  const preferences = row as TrialPlanningPreferences;
  // Reuse the native window/environment/profile validator. Zero is an exhausted
  // remaining budget, not a change to the existing 30-minute daily envelope.
  buildStudyDayPlan({ profile: profile(preferences), availability: { date, dayKind: "weekday",
    declaredActiveMinutes: Math.max(30, preferences.remainingMinutes), windows: preferences.windows }, candidates: [] });
  return structuredClone(preferences);
}

/** Aggregate metadata only. Each stored kernel remains separately validated with
 * its original examCycleId=sessionId and historical catalog compatibility. */
export function createOwnerLocalTodayService(store: PrivateFirstStageSessionStore,
  planning: TrialPlanningStore, catalog: PrivateFirstStageCatalog, now: () => string) {
  if (!activeOwnerLocalR3TrialCatalog(catalog) || !store.listOwnerSnapshot) fail("adapter_mismatch");
  const sessions = createPrivateFirstStageSessionService(store, catalog, now);
  function inBlock(date:string,block:{startMinute:number;endMinute:number},at=now()) {
    const local = kst(at), minute = (Date.parse(at) + 9 * 3600_000) % 86400_000 / 60000;
    return date===local.slice(0,10)&&minute>=block.startMinute&&minute<block.endMinute;
  }
  function executableNow(plan: ReturnType<typeof buildStudyDayPlan>, id: string, at = now()) {
    return plan.executionBlocks.some(block =>block.candidateId===id&&block.countsTowardActiveStudy&&inBlock(plan.date,block,at));
  }
  async function history(ownerId: string) {
    const snapshot = await store.listOwnerSnapshot!(ownerId, MODE);
    if (!Array.isArray(snapshot.sessions) || snapshot.sessions.length > 256 || typeof snapshot.complete !== "boolean") fail("adapter_mismatch");
    const seen = new Set<string>();
    const rows: PrivateSessionHistory[] = [], unavailable: string[] = [], unavailableQuestions:string[]=[];
    for (const value of snapshot.sessions) {
      if (value.ownerId !== ownerId || value.schemaVersion !== MODE || seen.has(value.sessionId)) fail("adapter_mismatch");
      seen.add(value.sessionId);
      try { rows.push(sessions.projectHistory(value, ownerId)); }
      catch {
        unavailable.push(value.sessionId);
        const references=value.state?.examCycle?.questionReferences;
        const id=Array.isArray(references)&&references.length===1?references[0]?.questionId:null;
        const creation=value.commands?.[0];
        // Reuse the durable create-command binding for absence accounting only.
        // Unknown catalogs/identities still block all absence claims, as before.
        const known=typeof id==="string"&&/^qnet-2025-36-s1-A-(?:4\d|[5-7]\d|80)$/u.test(id)&&creation&&
          knownOwnerLocalCatalogDigest(catalog,value.catalogDigest)&&
          value.sessionId===privateFirstStageSessionId(ownerId,creation.requestId)&&
          creation.requestDigest===privateSessionDigest({action:"create",requestId:creation.requestId,questionId:id});
        unavailableQuestions.push(known?id:"unknown");
      } // Quarantine affected history, never rewrite or present it as fresh stock.
    }
    return { rows, unavailable, unavailableQuestions, complete: snapshot.complete };
  }
  async function record(ownerId: string) {
    const value = await planning.load(ownerId);
    if (!value) return null;
    const {declaredAt,priorDates,selectedTopic,...persisted}=value;
    exactObject(persisted, ["schemaVersion","ownerId","revision","date","preferences","requestId","requestDigest","completedAtDeclaration","dispatches"]);
    if(declaredAt!==undefined && kst(requiredUtcInstant(declaredAt)).slice(0,10)!==value.date) fail("adapter_mismatch");
    if (value.schemaVersion !== "first_stage.owner_local_planning.v1" || value.ownerId !== ownerId ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(value.date) || !/^[a-f0-9]{64}$/u.test(value.requestDigest) ||
      !Array.isArray(value.completedAtDeclaration) || value.completedAtDeclaration.length > 1024 ||
      new Set(value.completedAtDeclaration).size !== value.completedAtDeclaration.length) fail("adapter_mismatch");
    requiredSafeInteger(value.revision,1,1_000_000); requiredIdentifier(value.requestId);
    value.completedAtDeclaration.forEach(id=>requiredIdentifier(id));
    if(!Array.isArray(value.dispatches) || value.dispatches.length>256) fail("adapter_mismatch");
    const dispatchIds=new Set<string>();
    for(const dispatch of value.dispatches) {
      const {block,...binding}=dispatch;
      exactObject(binding,["planId","action","catalogDigest","date","availabilityDigest"]);
      if(block!==undefined) {
        exactObject(block,["startMinute","endMinute"]);
        requiredSafeInteger(block.startMinute,0,1439);requiredSafeInteger(block.endMinute,1,1440);
        if(block.endMinute-block.startMinute!==15)fail("adapter_mismatch");
      }
      const {id,...action}=exactObject(dispatch.action,["id","kind","questionId","questionNumber","questionVersion","sessionId","revision","reviewTaskId","estimatedMinutes"]);
      requiredIdentifier(dispatch.planId);
      if(!/^\d{4}-\d{2}-\d{2}$/u.test(dispatch.date) || !/^[a-f0-9]{64}$/u.test(dispatch.availabilityDigest) ||
        !/^[a-f0-9]{64}$/u.test(dispatch.catalogDigest) || id!==actionId(action as Omit<TrialPlanAction,"id">) ||
        dispatchIds.has(`${dispatch.planId}:${id}`)) fail("adapter_mismatch");
      dispatchIds.add(`${dispatch.planId}:${id}`);
      requiredIdentifier(action.questionId); requiredIdentifier(action.questionVersion);
      requiredSafeInteger(action.questionNumber,1,200);
      if(!["new","begin","resume","retry"].includes(String(action.kind)) || action.estimatedMinutes!==15) fail("adapter_mismatch");
      if(action.kind==="new") {if(action.sessionId!==null || action.revision!==null || action.reviewTaskId!==null) fail("adapter_mismatch");}
      else {requiredIdentifier(action.sessionId);requiredSafeInteger(action.revision,1,512);
        if(action.kind==="retry")requiredIdentifier(action.reviewTaskId);else if(action.reviewTaskId!==null)fail("adapter_mismatch");}
    }
    validateTrialPlanningPreferences(value.preferences,value.date);
    if(priorDates!==undefined) {
      if(!Array.isArray(priorDates)||priorDates.length>3660||Buffer.byteLength(JSON.stringify(priorDates))>262144)fail("adapter_mismatch");
      const dates=new Set<string>();
      for(const prior of priorDates) {
        exactObject(prior,["date","preferences","declaredAt","requestId","requestDigest","completedAtDeclaration"]);
        if(!/^\d{4}-\d{2}-\d{2}$/u.test(prior.date)||prior.date>=value.date||dates.has(prior.date)||
          !/^[a-f0-9]{64}$/u.test(prior.requestDigest)||!Array.isArray(prior.completedAtDeclaration)||
          prior.completedAtDeclaration.length>1024||new Set(prior.completedAtDeclaration).size!==prior.completedAtDeclaration.length)fail("adapter_mismatch");
        if(prior.declaredAt!==null&&kst(requiredUtcInstant(prior.declaredAt)).slice(0,10)!==prior.date)fail("adapter_mismatch");
        requiredIdentifier(prior.requestId);prior.completedAtDeclaration.forEach((id:unknown)=>requiredIdentifier(id));
        validateTrialPlanningPreferences(prior.preferences,prior.date);dates.add(prior.date);
      }
    }
    if(selectedTopic!==undefined&&selectedTopic!==null) {
      exactObject(selectedTopic,["topicId","questionId","questionVersion","mappingVersion","selectedAt","requestId","requestDigest"]);
      for(const field of ["topicId","questionId","questionVersion","mappingVersion","requestId"] as const)requiredIdentifier(selectedTopic[field]);
      if(kst(requiredUtcInstant(selectedTopic.selectedAt)).slice(0,10)!==value.date||
        !/^[a-f0-9]{64}$/u.test(selectedTopic.requestDigest))fail("adapter_mismatch");
    }
    return value;
  }
  async function view(ownerId: string) {
    const at = requiredUtcInstant(now()), local = kst(at), date = local.slice(0,10);
    const [observed, saved] = await Promise.all([history(ownerId), record(ownerId)]);
    const recovery = observed.rows.map(row => projectOwnerLocalRecovery(row, at));
    const recoveryBySession = new Map(recovery.map(row => [row.sessionId, row]));
    const curriculum=projectOwnerLocalCurriculum(catalog,observed.rows,observed.unavailableQuestions,observed.complete);
    const selectedTopic=saved?.date===date?saved.selectedTopic??null:null;
    const selectedBinding=selectedTopic?curriculum.topics.find(topic=>topic.topicId===selectedTopic.topicId&&
      topic.questionId===selectedTopic.questionId&&topic.questionVersion===selectedTopic.questionVersion&&
      topic.mappingVersion===selectedTopic.mappingVersion&&topic.supply==="usable_unreviewed_trial"):null;
    const inventory = { originalCount: catalog.initialReferences.length, humanReviewedCount: 0,
      retryReservationIsFreshStock: false, sealedUnseenClaim: false };
    const common = { schemaVersion: "first_stage.owner_local_today.v1" as const, policyVersion: OWNER_LOCAL_TODAY_POLICY,
      date, history: observed.rows, recovery, unavailableSessionCount: observed.unavailable.length,
      historyComplete: observed.complete, inventory, curriculum, selectedTopic:selectedBinding?selectedTopic:null,
      priorDateBudgets:(saved?.priorDates??[]).map(row=>({date:row.date,declaredAt:row.declaredAt,declaredMinutes:row.preferences.remainingMinutes})),
      preferencesRevision: saved?.revision ?? 0,
      preferences: saved?.date === date ? saved.preferences : null,
      humanReviewComplete: false, masteryClaim: false, transferEvidence: false, measurementEvidence: false,
      capacityCalibrationClaim: false, canonicalDueTimesChanged: false };
    if (!observed.complete) return { ...common, state: "history_incomplete" as const, actions: [], plan: null };
    const completed = observed.rows.flatMap(row => row.committedAttempts);
    const newlyCompleted = completed.filter(item => !saved?.completedAtDeclaration.includes(item.attemptId) &&
      (!saved?.declaredAt || Date.parse(item.submittedAt!)>=Date.parse(saved.declaredAt)));
    // These are transparent per-item planning estimates, not observed study time.
    const completionDebitMinutes = newlyCompleted.length * 15;
    const remainingMinutes = Math.max(0,(saved?.preferences.remainingMinutes??0) - completionDebitMinutes);
    if (!saved || saved.date !== date || !saved.declaredAt) return { ...common, state: "availability_required" as const,
      actions: [], plan: null, remainingMinutes:saved?.date===date?remainingMinutes:null };
    // Reads do not move an unchanged timetable into the future. Only an actual
    // declaration/session event or newly due review advances its server anchor.
    // Expired unstarted blocks require an explicit availability replan.
    const anchors=[saved.declaredAt,...(selectedBinding&&selectedTopic?[selectedTopic.selectedAt]:[]),...observed.rows.flatMap(row=>[
      ...(row.active?[row.active.startedAt]:[]),
      ...row.committedAttempts.map(item=>item.submittedAt!).filter(Boolean),
      ...row.reviews.filter(item=>item.status==="pending"&&item.stock==="available"&&Date.parse(item.dueAt)<=Date.parse(at)).map(item=>item.dueAt)])];
    const anchorAt=new Date(Math.max(...anchors.map(value=>Date.parse(requiredUtcInstant(value))))).toISOString();
    const cutoff = Math.floor((Date.parse(anchorAt) + 9*3600_000) % 86400_000 / 60000);
    const windows = saved.preferences.windows.map(window => ({...window,startMinute:Math.max(cutoff,window.startMinute)}))
      .filter(window => window.endMinute > window.startMinute).sort((a,b)=>a.startMinute-b.startMinute);
    const actions: TrialPlanAction[] = [];
    function add(value: Omit<TrialPlanAction,"id">) { actions.push({ ...value, id: actionId(value) }); }
    for (const row of observed.rows) {
      const base = { questionId: row.questionId, questionNumber: row.questionNumber,
        questionVersion: row.questionVersion,
        sessionId: row.sessionId, revision: row.revision, estimatedMinutes: 15 };
      if (row.active || row.ready) add({ ...base, kind: row.active ? "resume" : "begin", reviewTaskId: null });
      else for (const review of row.reviews) {
        if (review.status === "pending" && review.stock === "available" && Date.parse(review.dueAt) <= Date.parse(at)) {
          add({ ...base, kind: "retry", reviewTaskId: review.reviewTaskId });
        }
      }
    }
    // Unknown/drifted rows cannot prove absence. Preserve independently valid
    // session actions while declining all new-stock absence claims until resolved.
    if (!observed.unavailableQuestions.includes("unknown")) for (const original of catalog.initialReferences) {
      if(observed.unavailableQuestions.includes(original.questionId))continue;
      if (!observed.rows.some(row => row.questionId === original.questionId)) add({ kind:"new",
        questionId:original.questionId, questionNumber:original.questionNumber, sessionId:null,
        questionVersion:original.questionVersion,
        revision:null, reviewTaskId:null, estimatedMinutes:15 });
    }
    const order = { resume:0, begin:0, new:2, retry:1 };
    actions.sort((a,b) => order[a.kind]-order[b.kind] || a.questionNumber-b.questionNumber || a.id.localeCompare(b.id));
    const protectedNew = saved.preferences.phase === "coverage" ?
      actions.find(action=>action.kind==="new"&&action.questionId===selectedBinding?.questionId)??actions.find(action => action.kind === "new") : undefined;
    function priority(action: TrialPlanAction) {
      return action.kind === "resume" || action.kind === "begin" ? 9000 : action.id === protectedNew?.id ? 8000 :
        action.kind === "retry" ? 6000 + (recoveryBySession.get(action.sessionId!)?.duePriorityBonus ?? 0) : 2000;
    }
    // Protect one feasible new-study opportunity before the planner's 256 cap.
    // Ongoing reservations precede it; recovery/content/time constraints are explicit.
    const ordered = [...actions].sort((a,b)=>priority(b)-priority(a) || a.questionNumber-b.questionNumber || a.id.localeCompare(b.id));
    const selected = ordered.slice(0,256), overflow = ordered.slice(256);
    const candidates: StudyTaskCandidateV1[] = selected.map(action => ({ id:action.id,
      title:`경제학 ${action.questionNumber}번 · ${action.kind === "new" ? "첫 연습" : action.kind === "retry" ? "기한 복습" : "이어하기"}`,
      subject:"economics_principles", examTrack:"first", taskKind:action.kind === "retry" ? "due_review" : "independent_problem_solving",
      cognitiveLoad:"medium", requiredness: action.kind === "new" ? "core_candidate" : "required",
      estimatedMinutes:15, minimumContinuousMinutes:15, splittable:false, requiresDesk:true,
      prioritySignals: action.kind === "new" ? ["new_study"] : action.kind === "retry" ?
        recoveryBySession.get(action.sessionId!)?.need === "repeated_key_mismatch" ? ["due_review", "repeated_error"] : ["due_review"] : ["learner_pinned"],
      basePriority:priority(action), outcomeKey:`owner-trial:${action.kind === "resume" || action.kind === "begin" ? "ongoing" : action.kind}`,
      metadataOnly:true }));
    const plan = buildStudyDayPlan({ profile:profile(saved.preferences), availability:{ date,
      dayKind:saved.preferences.phase === "recovery" ? "recovery" : "weekday",
      declaredActiveMinutes:Math.max(30,remainingMinutes), windows }, candidates,remainingActiveMinutes:remainingMinutes });
    const executable = new Set(plan.executionBlocks.filter(block=>block.countsTowardActiveStudy).map(block=>block.candidateId));
    const basis = { policy:OWNER_LOCAL_TODAY_POLICY, catalog:catalog.digest, ownerId, date,
      preferencesRevision:saved.revision, rows:observed.rows, unavailable:observed.unavailable,
      executable:[...executable], remainingMinutes, anchorAt, blocks:plan.executionBlocks };
    const executableNowActionIds=selected.filter(action=>executableNow(plan,action.id,at)).map(action=>action.id);
    const currentMinute=(Date.parse(at)+9*3600_000)%86400_000/60000;
    const pendingBlocks=plan.executionBlocks.filter(block=>block.countsTowardActiveStudy&&block.endMinute>currentMinute);
    return { ...common, state:"planned" as const, plan, planId:`trial-plan-${privateSessionDigest(basis)}`,
      actions:selected.filter(action=>executable.has(action.id)),
      executableNowActionIds, nextActionId:executableNowActionIds[0]??pendingBlocks[0]?.candidateId??null,
      expiredBlockCount:plan.executionBlocks.filter(block=>block.countsTowardActiveStudy&&block.endMinute<=currentMinute).length,
      remainingMinutes, completionDebitMinutes,
      completedSinceDeclaration:newlyCompleted.length, inProgressReservedMinutes:actions.filter(action=>action.kind==="resume").length*15,
      unallocatedMinutes:remainingMinutes-plan.plannedActiveMinutes, overflowCount:overflow.length,
      stockExhausted:actions.length===0, newStudyOpportunity:protectedNew ?
        { waitingBound:"one opportunity per sufficient plan; N successful new-study starts cover N eligible originals",
          reason:protectedNew.questionId===selectedBinding?.questionId?"declared_unstudied_topic":"earliest_eligible_unstudied_topic",
          selected:executable.has(protectedNew.id), exception:executable.has(protectedNew.id) ? null :
            plan.deferredTasks.find(task=>task.candidateId===protectedNew.id)?.reason ?? "ongoing_reservation_or_intake_bound" } : null };
  }
  async function savePreferences(ownerId: string, input: unknown) {
    const row = exactObject(input,["requestId","expectedRevision","preferences"]);
    const requestId=requiredIdentifier(row.requestId), expectedRevision=requiredSafeInteger(row.expectedRevision,0,999_999);
    const declaredAt=requiredUtcInstant(now()), date=kst(declaredAt).slice(0,10), preferences=validateTrialPlanningPreferences(row.preferences,date);
    const requestDigest=privateSessionDigest({requestId,expectedRevision,preferences});
    const current=await record(ownerId);
    if(current?.requestId===requestId) {
      if(current.requestDigest!==requestDigest) fail("invalid_transition");
      return view(ownerId);
    }
    if((current?.revision??0)!==expectedRevision) fail("stale_state");
    if(current&&current.date>date)fail("stale_state");
    const observed=await history(ownerId);
    if(!observed.complete || observed.unavailableQuestions.includes("unknown")) fail("stale_state");
    const completedAtDeclaration=observed.rows.flatMap(item=>item.committedAttempts.map(attempt=>attempt.attemptId));
    if(completedAtDeclaration.length>1024) fail("invalid_transition");
    const priorDates=[...(current?.priorDates??[])];
    if(current&&current.date<date)priorDates.push({date:current.date,preferences:current.preferences,declaredAt:current.declaredAt??null,
      requestId:current.requestId,requestDigest:current.requestDigest,completedAtDeclaration:current.completedAtDeclaration});
    if(priorDates.length>3660||Buffer.byteLength(JSON.stringify(priorDates))>262144)fail("invalid_transition");
    const next:TrialPlanningRecord={schemaVersion:"first_stage.owner_local_planning.v1",ownerId,date,declaredAt,
      revision:expectedRevision+1,preferences,requestId,requestDigest,completedAtDeclaration,dispatches:current?.dispatches??[],
      priorDates,selectedTopic:current?.date===date?current.selectedTopic??null:null};
    if(!await planning.save(next,expectedRevision)) {
      const winner=await record(ownerId);
      if(winner?.requestId!==requestId || winner.requestDigest!==requestDigest) fail("stale_state");
    }
    return view(ownerId);
  }
  async function selectTopic(ownerId:string,input:unknown) {
    const row=exactObject(input,["requestId","expectedRevision","topicId","mappingVersion","questionVersion"]);
    const requestId=requiredIdentifier(row.requestId),expectedRevision=requiredSafeInteger(row.expectedRevision,1,999_999);
    const requestDigest=privateSessionDigest(row),current=await record(ownerId);
    if(current?.selectedTopic?.requestId===requestId) {
      if(current.selectedTopic.requestDigest!==requestDigest)fail("invalid_transition");
      return view(ownerId);
    }
    if(!current||current.revision!==expectedRevision||current.date!==kst(now()).slice(0,10)||!current.declaredAt)fail("stale_state");
    const observed=await view(ownerId),topic=observed.curriculum.topics.find(value=>value.topicId===row.topicId);
    if(!topic?.selectable||topic.mappingVersion!==row.mappingVersion||topic.questionVersion!==row.questionVersion)fail("stale_state");
    const selectedAt=requiredUtcInstant(now());
    if(kst(selectedAt).slice(0,10)!==current.date||Date.parse(selectedAt)<Date.parse(current.declaredAt)||
      current.selectedTopic&&Date.parse(selectedAt)<Date.parse(current.selectedTopic.selectedAt))fail("stale_state");
    const selectedTopic={topicId:topic.topicId,questionId:topic.questionId,questionVersion:topic.questionVersion!,mappingVersion:topic.mappingVersion,
      selectedAt,requestId,requestDigest};
    if(!await planning.save({...current,revision:expectedRevision+1,selectedTopic},expectedRevision)) {
      const winner=await record(ownerId);
      if(winner?.selectedTopic?.requestId!==requestId||winner.selectedTopic.requestDigest!==requestDigest)fail("stale_state");
    }
    return view(ownerId);
  }
  async function dispatch(ownerId:string,input:unknown) {
    const row=exactObject(input,["planId","actionId"]);
    requiredIdentifier(row.planId); requiredIdentifier(row.actionId);
    let savedPreferences=await record(ownerId);
    if(!savedPreferences) fail("stale_state");
    let intent=savedPreferences.dispatches.find(item=>item.planId===row.planId && item.action.id===row.actionId);
    if(!intent) {
      const current=await view(ownerId);
      if(current.state!=="planned" || current.planId!==row.planId) fail("stale_state");
      const selected=current.actions.find(item=>item.id===row.actionId);
      if(!selected || !executableNow(current.plan,selected.id) || savedPreferences.dispatches.length>=256) fail("stale_state");
      const selectedBlock=current.plan.executionBlocks.find(block=>block.candidateId===selected.id&&block.countsTowardActiveStudy)!;
      intent={planId:String(row.planId),action:selected,catalogDigest:catalog.digest,date:current.date,availabilityDigest:savedPreferences.requestDigest,
        block:{startMinute:selectedBlock.startMinute,endMinute:selectedBlock.endMinute}};
      // Persist the exact selected intent before any session mutation, so lost
      // responses/partial create can retry the same command after restart. This
      // is a bounded dispatch index; completion is always read from the session.
      if(!await planning.save({...savedPreferences,revision:savedPreferences.revision+1,
        dispatches:[...savedPreferences.dispatches,intent]},savedPreferences.revision)) {
        savedPreferences=await record(ownerId);
        const winner=savedPreferences?.dispatches.find(item=>item.planId===row.planId && item.action.id===row.actionId);
        if(!winner) fail("stale_state");
        intent=winner;
      }
    }
    const action=intent.action;
    const reference=catalog.initialReferences.find(reference=>reference.questionId===action.questionId && reference.questionVersion===action.questionVersion);
    if(!reference || intent.catalogDigest!==catalog.digest&&!acceptsOwnerLocalCatalogReference(catalog,intent.catalogDigest,reference))fail("adapter_mismatch");
    const createRequestId=`trial-first-${privateSessionDigest(action.questionId).slice(0,40)}`;
    let sessionId=action.kind==="new" ? privateFirstStageSessionId(ownerId,createRequestId) : action.sessionId!;
    const command={action:action.kind==="retry"?"retry":"begin",
      requestId:action.kind==="new"?"trial-plan-initial-begin":`plan-${action.id}`,
      expectedRevision:action.kind==="new"?1:action.revision,
      ...(action.kind==="retry"?{reviewTaskId:action.reviewTaskId}:{questionId:action.questionId})};
    const existing=await store.load(ownerId,sessionId);
    const existingHistory=existing ? sessions.projectHistory(existing,ownerId) : null;
    const href=()=>({sessionId,href:`/app/first-stage/economics-trial?sessionId=${encodeURIComponent(sessionId)}`});
    if(action.kind!=="resume" && existing?.commands.some(item=>item.requestId===command.requestId)) {
      // Exact committed command replay is read-only even after the plan expires.
      await sessions.execute(ownerId,sessionId,command);return href();
    }
    if(action.kind==="retry" && existingHistory?.reviews.some(review=>review.reviewTaskId===action.reviewTaskId && review.status==="completed"))return href();
    // Keep the selected server slot through a partial create. Its ready row
    // changes queue priority but cannot move this already sealed intent's time.
    const slot=intent.block;
    // An intent is not permanent scheduling authority. Recheck unfinished work
    // against current capacity/date/catalog, including a partially created row.
    const latestPreferences=await record(ownerId),fresh=await view(ownerId);
    const executableCandidate=fresh.state==="planned" ? fresh.actions.find(candidate=>(candidate.id===action.id ||
        (action.kind==="new" && existingHistory?.ready && candidate.kind==="begin" &&
          candidate.sessionId===sessionId && candidate.questionVersion===action.questionVersion))) : undefined;
    if(fresh.state!=="planned" || fresh.date!==intent.date || latestPreferences?.requestDigest!==intent.availabilityDigest ||
      !slot || !inBlock(intent.date,slot) || !executableCandidate) {
      // A concurrent identical request may have committed during revalidation.
      const winner=await store.load(ownerId,sessionId);
      if(action.kind!=="resume" && winner?.commands.some(item=>item.requestId===command.requestId)) {
        await sessions.execute(ownerId,sessionId,command);return href();
      }
      fail("stale_state");
    }
    const assertStartTime=(at:string)=>{if(!inBlock(intent.date,slot,at))fail("stale_state");};
    if(action.kind==="new") {
      // Stable across plans/tabs/restarts; do not bind create identity to the
      // clock, request UUID or inventory digest. Existing manual sessions win.
      const saved=await sessions.create(ownerId,{requestId:createRequestId,questionId:action.questionId},true);
      sessionId=saved.sessionId;
      await sessions.execute(ownerId,sessionId,command,assertStartTime);
    } else if(action.kind!=="resume") {
      if(!existing) fail("not_found");
      await sessions.execute(ownerId,sessionId,command,assertStartTime);
    } else {
      const loaded=await store.load(ownerId,sessionId!);
      if(!loaded || sessions.projectHistory(loaded,ownerId).revision!==action.revision) fail("stale_state");
      assertStartTime(now());
    }
    return href();
  }
  return { view, savePreferences, selectTopic, dispatch };
}
