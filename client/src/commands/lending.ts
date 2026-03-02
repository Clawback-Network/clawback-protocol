import { DEFAULT_DIRECTORY_URL } from "@clawback/protocol";

const getDirectoryUrl = () =>
  process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

/** clawback request — submit a loan request */
export async function requestCommand(options: {
  amount: string;
  duration: string;
  purpose: string;
  minFunding?: string;
  deadline?: string;
  collateral?: string;
}): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const payload: Record<string, unknown> = {
    amount_requested: parseFloat(options.amount),
    duration_days: parseInt(options.duration, 10),
    purpose: options.purpose,
    funding_deadline_hours: parseInt(options.deadline || "48", 10),
  };

  if (options.minFunding) {
    payload.min_funding_amount = parseFloat(options.minFunding);
  }
  if (options.collateral) {
    payload.collateral_amount = parseFloat(options.collateral);
  }

  try {
    // POST to directory to create the loan request
    const res = await fetch(`${directoryUrl}/lending/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as { loanId: string };
      console.log(`Loan request created: ${data.loanId}`);
      console.log(`  Amount: ${options.amount} USDC`);
      console.log(`  Duration: ${options.duration} days`);
      console.log(`  Purpose: ${options.purpose}`);
    } else {
      const err = (await res.json()) as { error?: string };
      console.error(`Failed: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback assess — submit an assessment for a loan */
export async function assessCommand(
  loanId: string,
  options: { stake: string; apr: string; rationale?: string },
): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const payload: Record<string, unknown> = {
    loan_id: loanId,
    stake_amount: parseFloat(options.stake),
    apr: parseFloat(options.apr),
    decision: "fund",
  };

  if (options.rationale) {
    payload.rationale = options.rationale;
  }

  try {
    const res = await fetch(`${directoryUrl}/lending/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as { assessmentId: string };
      console.log(`Assessment submitted: ${data.assessmentId}`);
      console.log(`  Loan: ${loanId}`);
      console.log(`  Stake: ${options.stake} USDC`);
      console.log(`  APR: ${options.apr}%`);
    } else {
      const err = (await res.json()) as { error?: string };
      console.error(`Failed: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback withdraw — withdraw an assessment */
export async function withdrawCommand(loanId: string): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  try {
    const res = await fetch(`${directoryUrl}/lending/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan_id: loanId }),
    });

    if (res.ok) {
      console.log(`Assessment withdrawn for loan: ${loanId}`);
    } else {
      const err = (await res.json()) as { error?: string };
      console.error(`Failed: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback repay — make a repayment */
export async function repayCommand(
  loanId: string,
  options: { amount: string },
): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  try {
    const res = await fetch(`${directoryUrl}/lending/repay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loan_id: loanId,
        amount: parseFloat(options.amount),
      }),
    });

    if (res.ok) {
      console.log(`Repayment submitted for loan: ${loanId}`);
      console.log(`  Amount: ${options.amount} USDC`);
    } else {
      const err = (await res.json()) as { error?: string };
      console.error(`Failed: ${err.error || res.statusText}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback loans — list loans */
export async function loansCommand(options: {
  status?: string;
}): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);

  try {
    const res = await fetch(
      `${directoryUrl}/lending/loans?${params.toString()}`,
    );

    if (!res.ok) {
      console.error(`Failed: ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      loans: Array<{
        id: string;
        borrower_addr: string;
        amount_requested: number;
        status: string;
        total_funded: number;
        created_at: string;
      }>;
    };

    if (data.loans.length === 0) {
      console.log("No loans found.");
      return;
    }

    console.log(`Found ${data.loans.length} loan(s):\n`);
    for (const loan of data.loans) {
      console.log(`  ${loan.id} [${loan.status}]`);
      console.log(`    Borrower: ${loan.borrower_addr}`);
      console.log(
        `    Amount: ${loan.amount_requested} USDC (funded: ${loan.total_funded})`,
      );
      console.log(`    Created: ${loan.created_at}`);
      console.log();
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback loan — get single loan detail */
export async function loanCommand(loanId: string): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  try {
    const res = await fetch(`${directoryUrl}/lending/loans/${loanId}`);

    if (!res.ok) {
      if (res.status === 404) {
        console.error(`Loan not found: ${loanId}`);
      } else {
        console.error(`Failed: ${res.statusText}`);
      }
      return;
    }

    const loan = (await res.json()) as {
      id: string;
      borrower_addr: string;
      amount_requested: number;
      min_funding_amount: number;
      funding_deadline: string;
      collateral_amount: number;
      duration_days: number;
      purpose: string;
      status: string;
      total_funded: number;
      assessments: Array<{
        assessor_addr: string;
        stake_amount: number;
        apr: number;
        decision: string;
      }>;
      created_at: string;
    };

    console.log(`=== Loan: ${loan.id} ===\n`);
    console.log(`  Status:       ${loan.status}`);
    console.log(`  Borrower:     ${loan.borrower_addr}`);
    console.log(`  Amount:       ${loan.amount_requested} USDC`);
    console.log(`  Min funding:  ${loan.min_funding_amount} USDC`);
    console.log(`  Funded:       ${loan.total_funded} USDC`);
    console.log(`  Collateral:   ${loan.collateral_amount} USDC`);
    console.log(`  Duration:     ${loan.duration_days} days`);
    console.log(`  Deadline:     ${loan.funding_deadline}`);
    console.log(`  Purpose:      ${loan.purpose}`);
    console.log(`  Created:      ${loan.created_at}`);

    if (loan.assessments?.length > 0) {
      console.log(`\n  Assessments (${loan.assessments.length}):`);
      for (const a of loan.assessments) {
        console.log(
          `    ${a.assessor_addr}: ${a.stake_amount} USDC @ ${a.apr}% APR [${a.decision}]`,
        );
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback notifications — query notifications feed */
export async function notificationsCommand(options: {
  since?: string;
  types?: string;
  limit?: string;
}): Promise<void> {
  const directoryUrl = getDirectoryUrl();

  const params = new URLSearchParams();
  if (options.since) params.set("since", options.since);
  if (options.types) params.set("types", options.types);
  if (options.limit) params.set("limit", options.limit);

  try {
    const res = await fetch(
      `${directoryUrl}/lending/notifications?${params.toString()}`,
    );

    if (!res.ok) {
      console.error(`Failed: ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as {
      notifications: Array<{
        id: string;
        type: string;
        loan_id: string;
        agent_addr: string;
        data: Record<string, unknown>;
        timestamp: string;
      }>;
    };

    if (data.notifications.length === 0) {
      console.log("No notifications.");
      return;
    }

    console.log(`${data.notifications.length} notification(s):\n`);
    for (const n of data.notifications) {
      const date = new Date(n.timestamp)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
      console.log(`  [${date}] ${n.type} — loan ${n.loan_id}`);
      if (Object.keys(n.data).length > 0) {
        console.log(`    ${JSON.stringify(n.data)}`);
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
