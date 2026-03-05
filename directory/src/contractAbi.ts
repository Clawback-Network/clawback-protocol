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
    name: "CapitalClaimed",
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
          { name: "claimableInterest", type: "uint256" },
          { name: "claimableCapital", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  // ─── Write Functions ─────────────────────────────────────────

  {
    type: "function",
    name: "backAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "apr", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "adjustBacking",
    stateMutability: "nonpayable",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "newAmount", type: "uint256" },
      { name: "newApr", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawBacking",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "draw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "maxApr", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeBacker",
    stateMutability: "nonpayable",
    inputs: [{ name: "backer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimInterest",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimCapital",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "triggerDefault",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getEffectiveApr",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEffectiveAprAtMax",
    stateMutability: "view",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "maxApr", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMinimumRepayment",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * ERC-8004 Reputation Registry ABI — giveFeedback only.
 */
export const reputationRegistryAbi = [
  {
    type: "event",
    name: "NewFeedback",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "clientAddress", type: "address", indexed: true },
      { name: "feedbackIndex", type: "uint64", indexed: false },
      { name: "value", type: "int128", indexed: false },
      { name: "valueDecimals", type: "uint8", indexed: false },
      { name: "indexedTag1", type: "string", indexed: true },
      { name: "tag1", type: "string", indexed: false },
      { name: "tag2", type: "string", indexed: false },
      { name: "endpoint", type: "string", indexed: false },
      { name: "feedbackURI", type: "string", indexed: false },
      { name: "feedbackHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

/**
 * ERC-8004 Identity Registry ABI — agent registration.
 */
export const identityRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

/**
 * Minimal ERC-20 ABI for approve and allowance.
 */
export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
