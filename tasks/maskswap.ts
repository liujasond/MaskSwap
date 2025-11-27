import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

task("task:contracts", "Print MaskSwap and cUSDT addresses").setAction(async function (_args: TaskArguments, hre) {
  const { deployments } = hre;
  const cusdt = await deployments.get("ConfidentialUSDT");
  const maskSwap = await deployments.get("MaskSwap");

  console.log(`ConfidentialUSDT: ${cusdt.address}`);
  console.log(`MaskSwap: ${maskSwap.address}`);
});

task("task:swap", "Swap ETH for cUSDT via MaskSwap")
  .addParam("eth", "ETH amount to swap, e.g. 0.1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const amountInWei = ethers.parseEther(taskArguments.eth);
    const [signer] = await ethers.getSigners();

    const maskSwapDeployment = await deployments.get("MaskSwap");
    const maskSwap = await ethers.getContractAt("MaskSwap", maskSwapDeployment.address);

    console.log(`Swapping ${taskArguments.eth} ETH via MaskSwap at ${maskSwapDeployment.address}...`);
    const tx = await maskSwap.connect(signer).swap({ value: amountInWei });
    console.log(`tx hash: ${tx.hash}`);
    await tx.wait();
    console.log("Swap confirmed");
  });

task("task:decrypt-balance", "Decrypt cUSDT balance for an address")
  .addOptionalParam("address", "Account to inspect; defaults to first signer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const cusdtDeployment = await deployments.get("ConfidentialUSDT");
    const cusdt = await ethers.getContractAt("ConfidentialUSDT", cusdtDeployment.address);

    const [defaultSigner] = await ethers.getSigners();
    const target = taskArguments.address ?? defaultSigner.address;
    const signer = await ethers.getSigner(target);

    console.log(`Reading balance for ${target} from cUSDT at ${cusdtDeployment.address}...`);
    const encryptedBalance = await cusdt.confidentialBalanceOf(target);
    if (encryptedBalance === ethers.ZeroHash) {
      console.log("Encrypted balance: 0x0");
      console.log("Decrypted balance: 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cusdtDeployment.address,
      signer,
    );

    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Decrypted balance: ${clearBalance}`);
  });
