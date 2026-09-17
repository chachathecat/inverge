export type OwnerTheorySettings = { version: string; ownerId: string; projectId: string; model: string; apiKey: string; paidProjectVerified: boolean; dataSharingEnabled: boolean; verifiedAt: string; verificationEvidenceSha256: string };
export type OwnerTheoryAuthority = { userId: string; sourceItemId: string; purpose: "app1_initial_analysis" | "repair_verification"; questionSha256?: string; development?: {approvalId: string; supabaseUrl: string}; practiceDevelopment?: {approvalId: string; supabaseUrl: string} };
export const THEORY_POLICY: Readonly<{version: string; model: string; budgetMicros: number; inputTokenMaximum: number; maxOutputTokens: number; thinkingBudget: number; reservationMicros: number; maximumCalls: number}>;
export class OwnerTheoryError extends Error { code: string; constructor(code: string); }
export function validateTheorySettings(settings: unknown, now?: number): OwnerTheorySettings;
export function initializeTheoryBudget(root: string, settings: OwnerTheorySettings): Promise<void>;
export function readTheoryBudget(root: string, settings: OwnerTheorySettings): Promise<{connectionPending: boolean; usedReservations: number; reservedMicros: number; remainingMicros: number; remainingCalls: number; caseId: string | null; developmentUsedCalls: number}>;
export function generateOwnerTheory(root: string, settings: OwnerTheorySettings, authority: OwnerTheoryAuthority, request: unknown): Promise<{response: {text(): string}}>;
export function testOwnerTheoryConnection(root: string, settings: OwnerTheorySettings): Promise<{ok: true; modelVersion: string; usage: {promptTokenCount: number | null; candidatesTokenCount: number | null; thoughtsTokenCount: number | null; totalTokenCount: number | null}; estimatedCostMicros: number | null}>;

export type TheoryDevelopmentApproval = {approvalId: string; installationSha256: string; questionSha256: string; supabaseUrl: string; userId: string};
export function readTheoryDevelopmentApproval(root: string, settings: OwnerTheorySettings): Promise<TheoryDevelopmentApproval>;

export function readTheoryDevelopmentCallLimit(root: string, settings: OwnerTheorySettings): Promise<number>;
export function authorizeAdditionalTheoryDevelopmentCall(root: string, settings: OwnerTheorySettings): Promise<void>;

export type PracticeDevelopmentApproval = TheoryDevelopmentApproval & { maximumCalls:number; maximumSourceItems:number; maximumReservationMicros:number };
export function readPracticeDevelopmentApproval(root:string, settings:OwnerTheorySettings):Promise<PracticeDevelopmentApproval>;
export function readPracticeDevelopmentUsage(root:string, settings:OwnerTheorySettings):Promise<{usedCalls:number; maximumCalls:number}>;

export function readPracticeDevelopmentCallLimit(root:string, settings:OwnerTheorySettings):Promise<number>;
export function authorizeAdditionalPracticeDevelopmentCall(root:string, settings:OwnerTheorySettings):Promise<void>;
