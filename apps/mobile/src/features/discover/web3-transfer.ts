const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export interface Web3TransferRequest {
  fromAddress: string;
  toAddress: string;
  amountWei: bigint;
  balanceWei: bigint;
  chainId: number;
  activeChainId: number;
}

export interface Web3WalletClient {
  sendTransaction(input: {
    from: string;
    to: string;
    value: bigint;
    chainId: number;
  }): Promise<`0x${string}`>;
}

export class Web3TransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Web3TransferError";
  }
}

export function validateWeb3Transfer(request: Web3TransferRequest): string[] {
  const issues: string[] = [];

  if (!EVM_ADDRESS_PATTERN.test(request.fromAddress)) {
    issues.push("Invalid sender address.");
  }

  if (!EVM_ADDRESS_PATTERN.test(request.toAddress)) {
    issues.push("Invalid recipient address.");
  }

  if (request.fromAddress.toLowerCase() === request.toAddress.toLowerCase()) {
    issues.push("Sender and recipient must be different.");
  }

  if (request.amountWei <= 0n) {
    issues.push("Transfer amount must be greater than zero.");
  }

  if (request.balanceWei < request.amountWei) {
    issues.push("Insufficient balance for transfer.");
  }

  if (request.chainId !== request.activeChainId) {
    issues.push("Wallet is connected to the wrong network.");
  }

  return issues;
}

export async function submitWeb3Transfer(
  request: Web3TransferRequest,
  client: Web3WalletClient,
): Promise<`0x${string}`> {
  const issues = validateWeb3Transfer(request);

  if (issues.length > 0) {
    throw new Web3TransferError(issues.join(" "));
  }

  try {
    return await client.sendTransaction({
      from: request.fromAddress,
      to: request.toAddress,
      value: request.amountWei,
      chainId: request.chainId,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Web3TransferError(`Transfer failed: ${error.message}`);
    }

    throw new Web3TransferError("Transfer failed: unknown wallet error.");
  }
}
