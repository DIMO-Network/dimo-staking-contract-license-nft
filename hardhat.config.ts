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
  networks: {
    polygon: {
      url: process.env.POLYGON_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    amoy: {
      url: process.env.AMOY_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  mocha: {
    timeout: 200000,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/",
        },
      },
    ],
  },
  abiExporter: {
    path: "./abis",
    runOnCompile: true,
    only: [":Stake$"],
    format: "json",
  },
};

module.exports = config;
