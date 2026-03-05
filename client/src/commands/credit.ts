import { DEFAULT_DIRECTORY_URL } from "@clawback-network/protocol";

const getDirectoryUrl = () =>
  process.env.CLAWBACK_DIRECTORY_URL || DEFAULT_DIRECTORY_URL;

// ─── Write Commands (API → sign-ready payloads) ─────────────

/** clawback credit back <address> --from <addr> --amount <usdc> --apr <rate> */
export async function backCommand(
  borrower: string,
  options: { from: string; amount: string; apr: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/back`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
        amount: parseFloat(options.amount),
        apr: parseFloat(options.apr),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit adjust <address> --from <addr> --amount <usdc> --apr <rate> */
export async function adjustBackingCommand(
  borrower: string,
  options: { from: string; amount: string; apr: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
        amount: parseFloat(options.amount),
        apr: parseFloat(options.apr),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit withdraw <address> --from <addr> */
export async function withdrawBackingCommand(
  borrower: string,
  options: { from: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit draw --from <addr> --amount <usdc> [--max-apr <rate>] */
export async function drawCommand(options: {
  from: string;
  amount: string;
  maxApr?: string;
}): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      from: options.from,
      amount: parseFloat(options.amount),
    };
    if (options.maxApr !== undefined) {
      body.maxApr = Math.round(parseFloat(options.maxApr) * 100);
    }

    const res = await fetch(`${getDirectoryUrl()}/credit/tx/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit remove-backer <address> --from <addr> */
export async function removeBackerCommand(
  backer: string,
  options: { from: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/remove-backer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        backer,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit repay --from <addr> --amount <usdc> */
export async function creditRepayCommand(options: {
  from: string;
  amount: string;
}): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/repay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        amount: parseFloat(options.amount),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit register-8004 --name <name> --description <desc> */
export async function register8004Command(options: {
  name: string;
  description?: string;
}): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/register-8004`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit feedback <address> --from <addr> --score <0-100> --analysis <json> */
export async function feedbackCommand(
  borrower: string,
  options: { from: string; score: string; analysis: string },
): Promise<void> {
  try {
    let analysisObj: unknown;
    try {
      analysisObj = JSON.parse(options.analysis);
    } catch {
      console.error("Invalid JSON for --analysis");
      return;
    }

    const res = await fetch(`${getDirectoryUrl()}/credit/tx/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
        score: parseInt(options.score, 10),
        analysis: analysisObj,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit claim-interest <borrower> --from <addr> */
export async function claimInterestCommand(
  borrower: string,
  options: { from: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/claim-interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit claim-capital <borrower> --from <addr> */
export async function claimCapitalCommand(
  borrower: string,
  options: { from: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/claim-capital`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

/** clawback credit trigger-default <borrower> --from <addr> */
export async function triggerDefaultCommand(
  borrower: string,
  options: { from: string },
): Promise<void> {
  try {
    const res = await fetch(`${getDirectoryUrl()}/credit/tx/trigger-default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: options.from,
        borrower,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed: ${res.status} ${JSON.stringify(data)}`);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

// ─── Read Commands (directory API) ────────────────────────────────

interface CreditLineResponse {
  borrower_addr: string;
  total_backing: number;
  total_drawn: number;
  total_repaid: number;
  total_interest_paid: number;
  blended_apr: number;
  status: string;
  backer_count: number;
  backings?: Array<{
    assessor_addr: string;
    max_amount: number;
    apr: number;
    drawn_amount: number;
    earned_interest: number;
    claimable_interest: number;
    claimable_capital: number;
    active: boolean;
  }>;
}

/** clawback credit line <address> — view credit line details */
export async function creditLineCommand(address: string): Promise<void> {
  try {
    const directoryUrl = getDirectoryUrl();
    const res = await fetch(`${directoryUrl}/credit/lines/${address}`);

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`No credit line found for ${address}`);
      } else {
        console.error(`Request failed: ${res.status} ${res.statusText}`);
      }
      return;
    }

    const cl = (await res.json()) as CreditLineResponse;

    console.log(`=== Credit Line: ${cl.borrower_addr} ===\n`);
    console.log(`  Total Backing:   ${cl.total_backing} USDC`);
    console.log(`  Total Drawn:     ${cl.total_drawn} USDC`);
    console.log(`  Available:       ${cl.total_backing - cl.total_drawn} USDC`);
    console.log(`  Blended APR:     ${cl.blended_apr?.toFixed(2)}%`);
    console.log(`  Total Repaid:    ${cl.total_repaid} USDC`);
    console.log(`  Interest Paid:   ${cl.total_interest_paid} USDC`);
    console.log(`  Status:          ${cl.status}`);
    console.log(`  Backers:         ${cl.backer_count}`);
    const totalClaimable = cl.backings?.reduce((sum, b) => sum + (b.claimable_interest ?? 0), 0) ?? 0;
    if (totalClaimable > 0) {
      console.log(`  Claimable Int:   ${totalClaimable.toFixed(2)} USDC`);
    }
    if (cl.backings?.length) {
      console.log(`\n  Backers:`);
      for (const b of cl.backings) {
        const claimInfo = (b.claimable_interest > 0 ? `, claimable: ${b.claimable_interest.toFixed(2)}` : "") +
          (b.claimable_capital > 0 ? `, capital: ${b.claimable_capital.toFixed(2)}` : "");
        console.log(
          `    ${b.assessor_addr.slice(0, 10)}... — ${b.max_amount} USDC @ ${b.apr}% APR (drawn: ${b.drawn_amount}, earned: ${b.earned_interest}${claimInfo})`,
        );
      }
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

interface BackingsResponse {
  assessor: string;
  backings: Array<{
    borrower_addr: string;
    max_amount: number;
    apr: number;
    drawn_amount: number;
    earned_interest: number;
    claimable_interest: number;
    claimable_capital: number;
  }>;
  total_backed: number;
  total_exposure: number;
  agents_backed: number;
}

/** clawback credit backings <address> — view backing positions for an address */
export async function backingsCommand(address: string): Promise<void> {
  try {
    const directoryUrl = getDirectoryUrl();

    const res = await fetch(`${directoryUrl}/credit/backers/${address}`);
    if (!res.ok) {
      console.error(`Request failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as BackingsResponse;

    console.log(`=== Backing Positions: ${address} ===\n`);
    console.log(`  Total Backed:   ${data.total_backed} USDC`);
    console.log(`  Total Exposure: ${data.total_exposure} USDC`);
    console.log(`  Agents Backed:  ${data.agents_backed}\n`);

    if (data.backings.length === 0) {
      console.log("  No active backings.");
      return;
    }

    for (const b of data.backings) {
      const claimInfo = (b.claimable_interest > 0 ? `, claimable: ${b.claimable_interest.toFixed(2)}` : "") +
        (b.claimable_capital > 0 ? `, capital: ${b.claimable_capital.toFixed(2)}` : "");
      console.log(
        `  ${b.borrower_addr.slice(0, 10)}... — ${b.max_amount} USDC @ ${b.apr}% (drawn: ${b.drawn_amount}, earned: ${b.earned_interest}${claimInfo})`,
      );
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}

// ─── Event Labels ────────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
  agent_backed: "Backed",
  backing_adjusted: "Adjusted",
  backing_withdrawn: "Withdrawn",
  credit_drawn: "Draw",
  repayment_made: "Repayment",
  credit_line_defaulted: "Defaulted",
  interest_claimed: "Interest Claimed",
  capital_claimed: "Capital Claimed",
};

interface CreditEventResponse {
  events: Array<{
    event_type: string;
    borrower_addr: string;
    assessor_addr: string | null;
    amount: number | null;
    apr: number | null;
    block_number: number;
    tx_hash: string;
    event_timestamp: string;
  }>;
  total: number;
}

/** clawback credit events <address> — view recent credit events */
export async function eventsCommand(address: string): Promise<void> {
  try {
    const directoryUrl = getDirectoryUrl();

    const res = await fetch(
      `${directoryUrl}/credit/events/${address}?limit=20`,
    );
    if (!res.ok) {
      console.error(`Request failed: ${res.status} ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as CreditEventResponse;

    console.log(`=== Credit Events for ${address} ===\n`);
    console.log(`  Total events: ${data.total}\n`);

    if (data.events.length === 0) {
      console.log("  No events found.");
      return;
    }

    for (const e of data.events) {
      const label = EVENT_LABELS[e.event_type] ?? e.event_type;
      const ts = new Date(e.event_timestamp).toLocaleString();
      const amountStr = e.amount != null ? ` ${e.amount} USDC` : "";
      const aprStr = e.apr != null ? ` @ ${e.apr}%` : "";
      const counterparty = e.assessor_addr
        ? ` (assessor: ${e.assessor_addr.slice(0, 10)}...)`
        : "";
      console.log(`  [${ts}] ${label}${amountStr}${aprStr}${counterparty}`);
    }
  } catch (err) {
    console.error(`Could not reach directory: ${(err as Error).message}`);
  }
}
