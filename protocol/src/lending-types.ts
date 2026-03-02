/** ClawBack lending domain types */

/** Actions that can be performed in the lending protocol */
export type LendingAction =
  | "request"
  | "assess"
  | "withdraw"
  | "repay"
  | "activate"
  | "cancel"
  | "complete"
  | "default"
  | "query"
  | "notify";

/** A lending message sent as a DataPart over A2A */
export interface LendingMessage {
  action: LendingAction;
  loanId?: string;
  payload: Record<string, unknown>;
}

/** Status of a loan through its lifecycle */
export type LoanStatus =
  | "funding"
  | "active"
  | "completed"
  | "defaulted"
  | "cancelled";

/** A loan request submitted by a borrower */
export interface LoanRequest {
  /** USDC amount requested */
  amount_requested: number;
  /** Minimum funding required to activate the loan */
  min_funding_amount?: number;
  /** Hours before the funding deadline expires */
  funding_deadline_hours: number;
  /** Collateral amount in USDC */
  collateral_amount?: number;
  /** Loan duration in days */
  duration_days: number;
  /** Purpose of the loan */
  purpose: string;
}

/** An assessment/stake submitted by an assessor */
export interface Assessment {
  /** ID of the loan being assessed */
  loan_id: string;
  /** USDC amount staked */
  stake_amount: number;
  /** Annual percentage rate offered */
  apr: number;
  /** Assessor's decision */
  decision: "fund" | "reject";
  /** Rationale for the assessment */
  rationale?: string;
}

/** Lending metrics tracked per agent */
export interface AgentLendingMetrics {
  loans_requested: number;
  loans_completed: number;
  loans_defaulted: number;
  total_borrowed: number;
  total_repaid: number;
  assessments_made: number;
  accuracy_score: number;
  total_staked: number;
  total_earned: number;
  total_lost: number;
  blacklisted: boolean;
}

/** Notification types in the lending protocol */
export type ClawBackNotificationType =
  | "loan_created"
  | "loan_funded"
  | "loan_activated"
  | "loan_completed"
  | "loan_defaulted"
  | "loan_cancelled"
  | "assessment_received"
  | "assessment_withdrawn"
  | "repayment_received"
  | "deadline_approaching";

/** A notification in the lending protocol */
export interface ClawBackNotification {
  id: string;
  type: ClawBackNotificationType;
  loan_id: string;
  agent_addr: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/** Full detail of a loan */
export interface LoanDetail {
  id: string;
  borrower_addr: string;
  amount_requested: number;
  min_funding_amount: number;
  funding_deadline: string;
  collateral_amount: number;
  duration_days: number;
  purpose: string;
  status: LoanStatus;
  total_funded: number;
  assessments: AssessmentDetail[];
  created_at: string;
  activated_at?: string;
  completed_at?: string;
}

/** Full detail of an assessment */
export interface AssessmentDetail {
  id: string;
  loan_id: string;
  assessor_addr: string;
  stake_amount: number;
  apr: number;
  decision: "fund" | "reject";
  rationale?: string;
  created_at: string;
  withdrawn_at?: string;
}
