import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  ConfidentialUSDT,
  ConfidentialUSDT__factory,
  MaskSwap,
  MaskSwap__factory,
} from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
  receiver: HardhatEthersSigner;
};

async function deployFixture() {
  const [deployer, user, receiver] = await ethers.getSigners();

  const cusdtFactory = (await ethers.getContractFactory("ConfidentialUSDT")) as ConfidentialUSDT__factory;
  const cusdt = (await cusdtFactory.deploy()) as ConfidentialUSDT;

  const maskSwapFactory = (await ethers.getContractFactory("MaskSwap")) as MaskSwap__factory;
  const maskSwap = (await maskSwapFactory.deploy(await cusdt.getAddress())) as MaskSwap;

  return { cusdt, maskSwap, deployer, user, receiver };
}

describe("MaskSwap", function () {
  let cusdt: ConfidentialUSDT;
  let maskSwap: MaskSwap;
  let signers: Signers;

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("MaskSwap unit tests require the FHEVM mock. Skipping on non-mock network.");
      this.skip();
    }

    const deployed = await loadFixture(deployFixture);
    cusdt = deployed.cusdt;
    maskSwap = deployed.maskSwap;
    signers = {
      deployer: deployed.deployer,
      user: deployed.user,
      receiver: deployed.receiver,
    };
  });

  it("previews swap output with the fixed rate", async function () {
    const preview = await maskSwap.previewSwap(ethers.parseEther("1"));
    expect(preview).to.equal(3300n * 1_000_000n);
  });

  it("mints cUSDT for a swap and allows the user to decrypt the balance", async function () {
    const swapValue = ethers.parseEther("1");
    await maskSwap.connect(signers.user).swap({ value: swapValue });

    const encryptedBalance = await cusdt.confidentialBalanceOf(signers.user.address);
    expect(encryptedBalance).to.not.equal(ethers.ZeroHash);

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      await cusdt.getAddress(),
      signers.user,
    );

    expect(clearBalance).to.equal(3300n * 1_000_000n);
  });

  it("blocks zero-ETH swaps", async function () {
    await expect(maskSwap.connect(signers.user).swap({ value: 0 })).to.be.revertedWithCustomError(
      maskSwap,
      "NoEthProvided",
    );
  });

  it("lets the owner withdraw collected ETH", async function () {
    const swapValue = ethers.parseEther("0.5");
    await maskSwap.connect(signers.user).swap({ value: swapValue });

    const contractBalanceBefore = await ethers.provider.getBalance(await maskSwap.getAddress());
    expect(contractBalanceBefore).to.equal(swapValue);

    const receiverBalanceBefore = await ethers.provider.getBalance(signers.receiver.address);
    const withdrawTx = await maskSwap
      .connect(signers.deployer)
      .withdrawETH(signers.receiver.address, contractBalanceBefore);
    await withdrawTx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(await maskSwap.getAddress());
    const receiverBalanceAfter = await ethers.provider.getBalance(signers.receiver.address);

    expect(contractBalanceAfter).to.equal(0n);
    expect(receiverBalanceAfter - receiverBalanceBefore).to.equal(swapValue);
  });
});
