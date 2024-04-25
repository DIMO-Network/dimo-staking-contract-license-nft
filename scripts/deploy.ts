import * as fs from "fs";
import * as path from "path";
import { ethers, network, upgrades } from "hardhat";

function getAddresses() {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "addresses.json"), "utf8")
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const addresses = getAddresses();
  const DIMO_TOKEN = addresses[network.name].DimoToken.proxy;
  const DIMO_FOUNDATION = addresses[network.name].Foundation;
  const DEFAULT_ADMIN_ROLE = `0x0000000000000000000000000000000000000000000000000000000000000000`;

  const StakeFactory: any = await ethers.getContractFactory("Stake", deployer);

  const stakeProxy: any = await upgrades.deployProxy(
    StakeFactory,
    [DIMO_TOKEN],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await stakeProxy.deployed();

  console.log(`Stake contract deployed to ${stakeProxy.address}`);

  await (
    await stakeProxy.grantRole(DEFAULT_ADMIN_ROLE, DIMO_FOUNDATION)
  ).wait();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
