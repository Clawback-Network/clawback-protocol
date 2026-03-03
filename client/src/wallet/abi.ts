/**
 * Contract ABIs for CLI write operations on ClawBackLending.
 * Separate from directory/contractAbi.ts which only has events + view functions.
 */

export const clawBackLendingWriteAbi = [
  {
    type: "function",
    name: "createLoan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "loanId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "minFunding", type: "uint256" },
      { name: "collateral", type: "uint256" },
      { name: "durationDays", type: "uint256" },
      { name: "deadlineHours", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "assess",
    stateMutability: "nonpayable",
    inputs: [
      { name: "loanId", type: "bytes32" },
      { name: "stakeAmount", type: "uint256" },
      { name: "apr", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawAssessment",
    stateMutability: "nonpayable",
    inputs: [{ name: "loanId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "loanId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

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
] as const;

/**
 * Contract ABI for ClawBackCreditLine write operations.
 */
export const clawBackCreditLineAbi = [
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
    name: "claimInterest",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "draw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
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
    name: "registerAgentId",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "triggerDefault",
    stateMutability: "nonpayable",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [],
  },
  // View functions
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
    name: "getAvailableCredit",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTotalOutstanding",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Placeholder — set via CREDIT_LINE_CONTRACT_ADDRESS env var */
export const CLAWBACK_CREDIT_ADDRESS: `0x${string}` | "" = (process.env
  .CREDIT_LINE_CONTRACT_ADDRESS || "") as `0x${string}` | "";

/** Base L2 USDC (6 decimals) */
export const BASE_USDC_ADDRESS: `0x${string}` =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
