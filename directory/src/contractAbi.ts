/**
 * Human-readable viem ABI for ClawBackLending contract events and view functions.
 * Only includes what the indexer needs — events for polling + getLoan for enrichment.
 */
export const clawBackLendingAbi = [
  // ─── Events ───────────────────────────────────────────────────

  {
    type: "event",
    name: "LoanCreated",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanAssessed",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "assessor", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
      { name: "apr", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AssessmentWithdrawn",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "assessor", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanActivated",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "totalFunded", type: "uint256", indexed: false },
      { name: "activatedBy", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RepaymentMade",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanRepaid",
    inputs: [{ name: "loanId", type: "bytes32", indexed: true }],
  },
  {
    type: "event",
    name: "LoanDefaulted",
    inputs: [
      { name: "loanId", type: "bytes32", indexed: true },
      { name: "collateralDistributed", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanCancelled",
    inputs: [{ name: "loanId", type: "bytes32", indexed: true }],
  },

  // ─── View Functions ───────────────────────────────────────────

  {
    type: "function",
    name: "getLoan",
    stateMutability: "view",
    inputs: [{ name: "loanId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "borrower", type: "address" },
          { name: "amountRequested", type: "uint256" },
          { name: "minFundingAmount", type: "uint256" },
          { name: "totalFunded", type: "uint256" },
          { name: "totalRepaid", type: "uint256" },
          { name: "collateralAmount", type: "uint256" },
          { name: "fundingDeadline", type: "uint256" },
          { name: "activatedAt", type: "uint256" },
          { name: "durationDays", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
] as const;

/**
 * Human-readable viem ABI for ClawBackCreditLine contract events and view functions.
 */
export const clawBackCreditLineAbi = [
  // ─── Events ───────────────────────────────────────────────────

  {
    type: "event",
    name: "AgentBacked",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "apr", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BackingAdjusted",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "newAmount", type: "uint256", indexed: false },
      { name: "newApr", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BackingWithdrawn",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "InterestClaimed",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CreditDrawn",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newOutstanding", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RepaymentMade",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "principalPaid", type: "uint256", indexed: false },
      { name: "interestPaid", type: "uint256", indexed: false },
      { name: "newOutstanding", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CreditLineDefaulted",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "outstanding", type: "uint256", indexed: false },
      { name: "triggeredBy", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentIdRegistered",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "agentId", type: "uint256", indexed: false },
    ],
  },

  // ─── View Functions ───────────────────────────────────────────

  {
    type: "function",
    name: "getCreditLine",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [
      { name: "totalBacking", type: "uint256" },
      { name: "totalDrawn", type: "uint256" },
      { name: "totalRepaid", type: "uint256" },
      { name: "totalInterestPaid", type: "uint256" },
      { name: "lastRepaymentAt", type: "uint256" },
      { name: "defaulted", type: "bool" },
      { name: "backerCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getBacking",
    stateMutability: "view",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "backer", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "maxAmount", type: "uint256" },
          { name: "apr", type: "uint256" },
          { name: "drawnAmount", type: "uint256" },
          { name: "accruedInterest", type: "uint256" },
          { name: "earnedInterest", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
] as const;
