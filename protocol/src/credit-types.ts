/** Credit line domain types for the revolving credit model */

export type CreditLineStatus = "active" | "defaulted";

export interface CreditLine {
  borrower_addr: string;
  total_backing: number;
  total_drawn: number;
  total_repaid: number;
  total_interest_paid: number;
  blended_apr: number;
  status: CreditLineStatus;
  backer_count: number;
  last_repayment_at?: string;
}

export interface CreditBacking {
  borrower_addr: string;
  assessor_addr: string;
  max_amount: number;
  apr: number;
  drawn_amount: number;
  accrued_interest: number;
  earned_interest: number;
  active: boolean;
  created_at: string;
}

export interface CreditDrawEvent {
  borrower_addr: string;
  amount: number;
  new_outstanding: number;
  block_number: number;
  timestamp: string;
}

export interface CreditRepaymentEvent {
  borrower_addr: string;
  principal_paid: number;
  interest_paid: number;
  new_outstanding: number;
  block_number: number;
  timestamp: string;
}

export interface AssessorMetrics {
  address: string;
  total_backed: number;
  total_drawn_exposure: number;
  total_earned: number;
  total_lost: number;
  agents_backed: number;
  default_rate: number;
}
