/**
 * Wallet-agnostic interface for sending on-chain transactions.
 * Implementations: BankrWalletProvider (default), LocalWalletProvider.
 */
export interface WalletProvider {
  getAddress(): Promise<`0x${string}`>;
  sendTransaction(tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<`0x${string}`>;
}
