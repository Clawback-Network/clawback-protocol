/** Zod schemas for credit line types */

import { z } from "zod";

export const creditLineStatusSchema = z.enum(["active", "defaulted"]);

export const creditLineSchema = z.object({
  borrower_addr: z.string().min(1),
  total_backing: z.number().min(0),
  total_drawn: z.number().min(0),
  total_repaid: z.number().min(0),
  total_interest_paid: z.number().min(0),
  blended_apr: z.number().min(0),
  status: creditLineStatusSchema,
  backer_count: z.number().int().min(0),
  last_repayment_at: z.string().optional(),
  agent_id: z.number().int().optional(),
});

export const creditBackingSchema = z.object({
  borrower_addr: z.string().min(1),
  assessor_addr: z.string().min(1),
  max_amount: z.number().min(0),
  apr: z.number().min(0),
  drawn_amount: z.number().min(0),
  accrued_interest: z.number().min(0),
  earned_interest: z.number().min(0),
  active: z.boolean(),
  created_at: z.string(),
});

export const creditDrawEventSchema = z.object({
  borrower_addr: z.string().min(1),
  amount: z.number().positive(),
  new_outstanding: z.number().min(0),
  block_number: z.number().int().min(0),
  timestamp: z.string(),
});

export const creditRepaymentEventSchema = z.object({
  borrower_addr: z.string().min(1),
  principal_paid: z.number().min(0),
  interest_paid: z.number().min(0),
  new_outstanding: z.number().min(0),
  block_number: z.number().int().min(0),
  timestamp: z.string(),
});

export const assessorMetricsSchema = z.object({
  address: z.string().min(1),
  total_backed: z.number().min(0),
  total_drawn_exposure: z.number().min(0),
  total_earned: z.number().min(0),
  total_lost: z.number().min(0),
  agents_backed: z.number().int().min(0),
  default_rate: z.number().min(0).max(1),
});
