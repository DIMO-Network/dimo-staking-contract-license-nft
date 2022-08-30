/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as hre from "hardhat";

export { createSnapshot, revertToSnapshot };

async function createSnapshot(): Promise<string> {
  return await new Promise((resolve, reject) => {
    hre.network.provider
      .send("evm_snapshot", [])
      .then((res) => {
        return resolve(res);
      })
      .catch((err) => {
        return reject(err);
      });
  });
}

async function revertToSnapshot(snapshot: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    hre.network.provider
      .send("evm_revert", [snapshot])
      .then((res) => {
        return resolve(res);
      })
      .catch((err) => {
        return reject(err);
      });
  });
}
