import { describe, expect, it, vi } from "vitest";

import {
  Web3TransferError,
  submitWeb3Transfer,
  validateWeb3Transfer,
  type Web3TransferRequest,
  type Web3WalletClient,
} from "../src/features/discover/web3-transfer";

function createRequest(overrides: Partial<Web3TransferRequest> = {}): Web3TransferRequest {
  return {
    fromAddress: "0x1111111111111111111111111111111111111111",
    toAddress: "0x2222222222222222222222222222222222222222",
    amountWei: 1_000_000_000_000_000_000n,
    balanceWei: 3_000_000_000_000_000_000n,
    chainId: 1,
    activeChainId: 1,
    ...overrides,
  };
}

describe("web3 transfer", () => {
  it("submits a valid EVM transfer through the wallet client", async () => {
    const sendTransaction = vi.fn<Web3WalletClient["sendTransaction"]>().mockResolvedValue(
      "0xabc123",
    );
    const request = createRequest();

    await expect(
      submitWeb3Transfer(request, {
        sendTransaction,
      }),
    ).resolves.toBe("0xabc123");

    expect(sendTransaction).toHaveBeenCalledWith({
      from: request.fromAddress,
      to: request.toAddress,
      value: request.amountWei,
      chainId: request.chainId,
    });
  });

  it("reports validation issues for an invalid recipient and insufficient balance", () => {
    const issues = validateWeb3Transfer(
      createRequest({
        toAddress: "not-an-address",
        balanceWei: 500_000_000_000_000_000n,
      }),
    );

    expect(issues).toEqual([
      "Invalid recipient address.",
      "Insufficient balance for transfer.",
    ]);
  });

  it("rejects transfers when the wallet is connected to the wrong network", async () => {
    await expect(
      submitWeb3Transfer(
        createRequest({
          chainId: 10,
          activeChainId: 1,
        }),
        {
          sendTransaction: vi.fn(),
        },
      ),
    ).rejects.toThrowError(
      new Web3TransferError("Wallet is connected to the wrong network."),
    );
  });

  it("wraps wallet client failures with a transfer-specific error", async () => {
    await expect(
      submitWeb3Transfer(createRequest(), {
        sendTransaction: vi.fn().mockRejectedValue(new Error("User rejected the request")),
      }),
    ).rejects.toThrowError(
      new Web3TransferError("Transfer failed: User rejected the request"),
    );
  });
});
