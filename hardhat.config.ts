import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import "hardhat-abi-exporter";

import "./tasks/accounts";
import "./tasks/balance";
import "./tasks/block-number";
import { HardhatUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 200000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  abiExporter: {
    path: "./abis",
    runOnCompile: true,
    only: [":Stake$"],
    format: "json",
  },
};

module.exports = config;
