/** Zod schemas for ClawBack lending types */

import { z } from "zod";

export const lendingActionSchema = z.enum([
  "request",
  "assess",
  "withdraw",
  "repay",
  "activate",
  "cancel",
  "complete",
  "default",
  "query",
  "notify",
]);

export const lendingMessageSchema = z.object({
  action: lendingActionSchema,
  loanId: z.string().optional(),
  payload: z.record(z.unknown()),
});

export const loanStatusSchema = z.enum([
  "funding",
  "active",
  "completed",
  "defaulted",
  "cancelled",
]);

export const loanRequestSchema = z.object({
  amount_requested: z.number().positive(),
  min_funding_amount: z.number().positive().optional(),
  funding_deadline_hours: z.number().positive(),
  collateral_amount: z.number().min(0).optional(),
  duration_days: z.number().int().positive(),
  purpose: z.string().min(1),
});

export const assessmentSchema = z.object({
  loan_id: z.string().min(1),
  stake_amount: z.number().positive(),
  apr: z.number().min(0).max(100),
  decision: z.enum(["fund", "reject"]),
  rationale: z.string().optional(),
});

export const agentLendingMetricsSchema = z.object({
  loans_requested: z.number().int().min(0),
  loans_completed: z.number().int().min(0),
  loans_defaulted: z.number().int().min(0),
  total_borrowed: z.number().min(0),
  total_repaid: z.number().min(0),
  assessments_made: z.number().int().min(0),
  accuracy_score: z.number().min(0).max(1),
  total_staked: z.number().min(0),
  total_earned: z.number().min(0),
  total_lost: z.number().min(0),
  blacklisted: z.boolean(),
});

export const clawBackNotificationTypeSchema = z.enum([
  "loan_created",
  "loan_funded",
  "loan_activated",
  "loan_completed",
  "loan_defaulted",
  "loan_cancelled",
  "assessment_received",
  "assessment_withdrawn",
  "repayment_received",
  "deadline_approaching",
]);

export const clawBackNotificationSchema = z.object({
  id: z.string().min(1),
  type: clawBackNotificationTypeSchema,
  loan_id: z.string().min(1),
  agent_addr: z.string().min(1),
  data: z.record(z.unknown()),
  timestamp: z.string(),
});
