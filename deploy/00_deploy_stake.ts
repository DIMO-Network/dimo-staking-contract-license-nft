/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { DeployFunction } from "hardhat-deploy/types";
import { THardhatRuntimeEnvironmentExtended } from "helpers/types/THardhatRuntimeEnvironmentExtended";

const func: DeployFunction = async (
  hre: THardhatRuntimeEnvironmentExtended
) => {
  const { getNamedAccounts, ethers, upgrades } = hre;
  const { deployer } = await getNamedAccounts();

  const DIMO_TOKEN = `0x80Ee7ec4493A1d7975ab900F94dB25ba7C688201`; //mumbai
  const DIMO_FOUNDATION = `0xEB0Cf16298582e4DC408a0A52d5232f1204675C3`; // temporary

  const StakeFactory: any = await ethers.getContractFactory("Stake", deployer);

  const stakeProxy: any = await upgrades.deployProxy(
    StakeFactory,
    [DIMO_TOKEN],
    {
      initializer: "initialize",
    }
  );

  await stakeProxy.deployed();

  const defaultAdminRoleBytes = `0x0000000000000000000000000000000000000000000000000000000000000000`;
  // replace with Multisig address later
  await (
    await stakeProxy.grantRole(defaultAdminRoleBytes, DIMO_FOUNDATION)
  ).wait();

  // revoke deployer address in the future
  // `revokeRole()`

  // v2
  // const StakeV2: any = await ethers.getContractFactory('StakeV2', deployer);
  // const upgraded: any = await upgrades.upgradeProxy(stakeProxy.address, StakeV2);
  // await upgraded.deployed();

  // const test = await upgraded.helloWorld();
  // console.log('test', test);
};
export default func;
func.tags = ["Stake"];
