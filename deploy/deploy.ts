import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cusdtDeployment = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  const maskSwapDeployment = await deploy("MaskSwap", {
    from: deployer,
    args: [cusdtDeployment.address],
    log: true,
  });

  console.log(`ConfidentialUSDT contract: ${cusdtDeployment.address}`);
  console.log(`MaskSwap contract: ${maskSwapDeployment.address}`);
};
export default func;
func.id = "deploy_maskswap"; // id required to prevent reexecution
func.tags = ["MaskSwap"];
