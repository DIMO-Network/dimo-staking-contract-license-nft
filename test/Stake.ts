/* eslint-disable @typescript-eslint/no-unsafe-argument */
import "../helpers/hardhat-imports";
import "./helpers/chai-imports";

import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  Dimo__factory,
  Dimo,
  Stake__factory,
  Stake,
  StakeV2,
  StakeV2__factory,
} from "generated/contract-types";
import hre from "hardhat";
import { getHardhatSigners, THardhatAccounts } from "tasks/functions/accounts";

import { createSnapshot, revertToSnapshot } from "./helpers/snapshot";
const { upgrades, ethers } = hre;

const minStakeAmount = ethers.utils.parseEther("100000"); // 100,000
const newMinStakeAmount = ethers.utils.parseEther("500000"); // 500,000
const accidentalDimo = ethers.utils.parseEther("50");
const tenDimo = ethers.utils.parseEther("10");
const largeApprovalAmount = ethers.utils.parseEther("99999999999999999999");

describe("Stake", function () {
  let DimoTokenContract: Dimo;
  let Stake: Contract | Stake | StakeV2;
  let snapshot: string;

  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  before(async () => {
    const signers: THardhatAccounts = await getHardhatSigners(hre);

    ({ deployer, user1, user2 } = signers);

    const DimoTokenFactory = new Dimo__factory(deployer);
    DimoTokenContract = await DimoTokenFactory.deploy(deployer.address);

    const StakeFactory = new Stake__factory(deployer);
    Stake = await upgrades.deployProxy(
      StakeFactory,
      [DimoTokenContract.address],
      {
        initializer: "initialize",
      }
    );

    await Stake.deployed();
  });

  beforeEach(async () => {
    snapshot = await createSnapshot();
  });

  afterEach(async () => {
    await revertToSnapshot(snapshot);
  });

  describe("constructor()", function () {
    it("Should have a token balance on Owner address", async () => {
      const ownerBalance = await DimoTokenContract.balanceOf(deployer.address);

      expect(ownerBalance.toString()).to.not.equal(`0`);
    });

    it("Should have no token balance on non-owner address", async () => {
      const nonOwnerBalance = await DimoTokenContract.balanceOf(user1.address);

      expect(nonOwnerBalance.toString()).to.equal(`0`);
    });

    it("Should correctly grant role", async () => {
      await Stake.grantRole(DEFAULT_ADMIN_ROLE, user2.address);

      expect(await Stake.hasRole(DEFAULT_ADMIN_ROLE, user2.address)).to.be.true;
    });
  });

  describe("stake()", function () {
    it("Should revert if the user has no DIMO allowance", async () => {
      await expect(Stake.stake(minStakeAmount)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("Should revert due to invalid amount", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      const badAmount = "1000000000000000000000";

      await expect(Stake.stake(badAmount)).to.be.revertedWith(
        "amount below the mininum staking requirement"
      );
    });

    it("Should emit tokens staked successfully", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);

      await expect(Stake.stake(minStakeAmount))
        .to.emit(Stake, "StakeTokens")
        .withArgs(deployer.address, minStakeAmount);
    });

    it("Should fail when DIMO token is paused", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);

      await DimoTokenContract.pause();

      await expect(Stake.stake(minStakeAmount)).to.be.revertedWith(
        "ERC20Pausable: token transfer while paused"
      );
    });
  });

  describe("checkUserIsWhitelisted()", function () {
    it("should be false when no tokens are staked", async () => {
      expect(await Stake.checkUserIsWhitelisted(user1.address)).to.be.false;
    });

    it("should be true when tokens are staked", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      expect(await Stake.checkUserIsWhitelisted(deployer.address)).to.be.true;
    });
  });

  describe("unstake()", function () {
    it("Should revert due to caller not being the owner", async () => {
      await expect(
        Stake.connect(user2).unstake(user2.address, minStakeAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${user2.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("Should revert due to user not having staked balance", async () => {
      await expect(
        Stake.unstake(user1.address, minStakeAmount)
      ).to.be.revertedWith("User does not have enough staked balance");
    });

    it("Should emit unstakeTokens successfully", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      await expect(Stake.unstake(deployer.address, minStakeAmount))
        .to.emit(Stake, "UnstakeTokens")
        .withArgs(deployer.address, minStakeAmount);
    });

    it("Should decrement checkUserStakedBalance properly", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      const originalBalance = await Stake.checkUserStakedBalance(
        deployer.address
      );

      await Stake.unstake(deployer.address, tenDimo);

      const newStakedAmount = await Stake.checkUserStakedBalance(
        deployer.address
      );
      expect(newStakedAmount).to.be.equal(originalBalance.sub(tenDimo));
    });

    it("Should decrement dimoTotalAmountStaked properly", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      const originalWithdrawableAmount = await Stake.dimoTotalAmountStaked();

      await Stake.unstake(deployer.address, tenDimo);

      const newStakedAmount = await Stake.dimoTotalAmountStaked();
      expect(newStakedAmount).to.be.equal(
        originalWithdrawableAmount.sub(tenDimo)
      );
    });
  });

  describe("checkUserStakedBalance()", function () {
    it("should be 0 when no tokens are staked", async () => {
      const stakedBalance = await Stake.checkUserStakedBalance(user1.address);
      expect(stakedBalance.toString()).to.equal("0");
    });

    it("should be 1000000000000000000000000 when tokens are staked", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      const stakedBalance = await Stake.checkUserStakedBalance(
        deployer.address
      );
      expect(stakedBalance.toString()).to.equal(minStakeAmount);
    });
  });

  describe("setNewMinStakeAmount()", function () {
    it("Should revert due to caller not being the owner", async () => {
      await expect(
        Stake.connect(user1).setNewMinStakeAmount(newMinStakeAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("should be 100,000 initially", async () => {
      const initialMinStakeAmount = await Stake.minStakeAmount();

      expect(initialMinStakeAmount.toString()).to.equal(minStakeAmount);
    });

    it("should be a new value when reassigned", async () => {
      await Stake.setNewMinStakeAmount(newMinStakeAmount);
      const changedAmount = await Stake.minStakeAmount();

      expect(changedAmount.toString()).to.equal(newMinStakeAmount);
    });
  });

  describe("getWithdrawableAmount()", function () {
    const incrementalDimo = accidentalDimo;

    it("should have 0 initially", async () => {
      const withdrawableAmount = await Stake.getWithdrawableAmount();

      expect(withdrawableAmount.toString()).to.equal("0");
    });

    it("should increment after sending tokens to contract", async () => {
      await DimoTokenContract.transfer(Stake.address, incrementalDimo);
      const withdrawableAmount = await Stake.getWithdrawableAmount();

      expect(withdrawableAmount.toString()).to.equal(
        incrementalDimo.toString()
      );
    });
  });

  describe("emergencyWithdraw()", function () {
    it("Should revert since there are no accidental funds in the contract", async () => {
      await expect(
        Stake.emergencyWithdraw(deployer.address, "1000000000000000000000")
      ).to.be.revertedWith("Not enough withdrawable funds");
    });

    it("Should emit successful emergency withdrawal", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      await DimoTokenContract.transfer(Stake.address, accidentalDimo);

      await expect(Stake.emergencyWithdraw(deployer.address, accidentalDimo))
        .to.emit(Stake, "EmergencyWithdrawal")
        .withArgs(deployer.address, accidentalDimo);
    });

    it("Should refund accidental send from unstaked user", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);

      await DimoTokenContract.transfer(Stake.address, minStakeAmount);

      await expect(Stake.emergencyWithdraw(deployer.address, minStakeAmount))
        .to.emit(Stake, "EmergencyWithdrawal")
        .withArgs(deployer.address, minStakeAmount);
    });

    it("Should refund accidental send from staked user and maintain a minstake balance", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      await DimoTokenContract.transfer(Stake.address, accidentalDimo);

      await Stake.emergencyWithdraw(deployer.address, accidentalDimo);

      const userStakedBalance = await Stake.checkUserStakedBalance(
        deployer.address
      );
      expect(userStakedBalance.toString()).to.be.equal(minStakeAmount);
    });
  });

  describe("balanceOf()", function () {
    it("should be 0 when holding no licenses", async () => {
      const LicenseBalance = await Stake.balanceOf(user1.address);

      expect(LicenseBalance.toString()).to.equal("0");
    });

    it("should be 1 after minting a license", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(newMinStakeAmount);
      await Stake.mint(deployer.address);
      const LicenseBalance = await Stake.balanceOf(deployer.address);

      expect(LicenseBalance.toString()).to.equal("1");
    });
  });

  describe("mint()", function () {
    it("Should revert due to caller not being the owner", async () => {
      await expect(Stake.connect(user1).mint(user1.address)).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("should revert when user hasn't staked DIMO", async () => {
      await expect(Stake.mint(deployer.address)).to.be.revertedWith(
        "User has not staked the required DIMO tokens"
      );
    });

    it("should mint DIMO License", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(newMinStakeAmount);
      await Stake.mint(deployer.address);

      const userLicenceBalance = await Stake.balanceOf(deployer.address);

      expect(userLicenceBalance).to.equal(1);
      await expect(Stake.mint(deployer.address)).to.not.be.reverted;
    });
  });

  describe("tokenURI()", function () {
    it("should revert a non-existent tokenURI", async () => {
      await expect(Stake.tokenURI(0)).to.be.revertedWith(
        `tokenURI: token doesn't exist`
      );
    });

    it("should return tokenURI", async () => {
      const firstString = `https://dimo.zone/1`;
      const secondString = `https://dimo.zone/2`;

      await Stake.setDimoURI(`https://dimo.zone/`);
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(newMinStakeAmount);
      await Stake.mint(deployer.address);

      expect(await Stake.tokenURI(1)).to.equal(firstString);

      await Stake.mint(deployer.address);
      expect(await Stake.tokenURI(2)).to.equal(secondString);
    });
  });

  describe("revoke()", function () {
    it("Should revert due to caller not being the owner", async () => {
      await expect(
        Stake.connect(user1).revoke(user1.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("should revert when user hasn't staked DIMO", async () => {
      await expect(Stake.revoke("1")).to.be.revertedWith(
        `ownerOf: token doesn't exist`
      );
    });

    it("should return empty on tokenId of 0 before mints", async () => {
      const userLicenceBalance = await Stake.balanceOf(deployer.address);

      expect(userLicenceBalance).to.equal("0");
    });

    it("should revert when revoking a DIMO License that doesnt exist", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(newMinStakeAmount);

      await expect(Stake.revoke("1")).to.be.revertedWith(
        `ownerOf: token doesn't exist`
      );
    });

    it("should properly mint and revoke a DIMO License", async () => {
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(newMinStakeAmount);
      await Stake.mint(deployer.address);
      const userLicenceBalance = await Stake.balanceOf(deployer.address);

      expect(userLicenceBalance).to.equal("1");
      await Stake.revoke("1");
      expect(await Stake.balanceOf(deployer.address)).to.equal("0");
    });
  });

  describe("upgraded contract", function () {
    it("Should be have the same stake amount even after upgrading", async () => {
      const initialMinStakeAmount = await Stake.minStakeAmount();

      const StakeV2Factory = new StakeV2__factory(deployer);
      const upgraded: any = await upgrades.upgradeProxy(
        Stake.address,
        StakeV2Factory
      );
      await upgraded.deployed();

      expect(initialMinStakeAmount.toString()).to.equal(minStakeAmount);
    });

    it("Should be able to call helloWorld() in V2 contract", async () => {
      const StakeV2Factory = new StakeV2__factory(deployer);
      const upgraded: any = await upgrades.upgradeProxy(
        Stake.address,
        StakeV2Factory
      );
      await upgraded.deployed();

      expect(await upgraded.helloWorld()).to.be.equal("Hello World");
    });

    it("Should be able to read the new variable in V2 contract", async () => {
      const StakeV2Factory = new StakeV2__factory(deployer);
      const upgraded: any = await upgrades.upgradeProxy(
        Stake.address,
        StakeV2Factory
      );
      await upgraded.deployed();

      await upgraded.test();

      expect(await upgraded.v2variable()).to.be.equal("test");
    });

    it("Should retain v1 variables", async () => {
      // stake first
      await DimoTokenContract.approve(Stake.address, largeApprovalAmount);
      await Stake.stake(minStakeAmount);

      const bool = await Stake.checkUserIsWhitelisted(deployer.address);

      // tokenURI
      await Stake.setDimoURI(`https://dimo.zone/`);
      const tokenName = await Stake.name();
      const tokenSymbol = await Stake.symbol();

      // mint license
      await Stake.mint(deployer.address);
      const LicenseBalance = await Stake.balanceOf(deployer.address);

      // minStakeAmount
      const minStakeVal = await Stake.minStakeAmount();

      // dimoTotalAmountStaked
      const dimoTotalAmountStakedVal = await Stake.dimoTotalAmountStaked();

      // staked balance of
      const stakedBalance = await Stake.checkUserStakedBalance(user1.address);

      const tokenURI = await Stake.tokenURI(1);

      // upgrade to v2
      const StakeV2Factory = new StakeV2__factory(deployer);
      const upgraded: any = await upgrades.upgradeProxy(
        Stake.address,
        StakeV2Factory
      );
      await upgraded.deployed();

      const boolv2 = await Stake.checkUserIsWhitelisted(deployer.address);
      const LicenseBalancev2 = await Stake.balanceOf(deployer.address);
      const minStakeValv2 = await Stake.minStakeAmount();
      const dimoTotalAmountStakedValv2 = await Stake.dimoTotalAmountStaked();
      const stakedBalancev2 = await Stake.checkUserStakedBalance(user1.address);

      const tokenURIv2 = await Stake.tokenURI(1);
      const tokenNamev2 = await Stake.name();
      const tokenSymbolv2 = await Stake.symbol();

      expect(tokenName).to.equal(tokenNamev2);
      expect(tokenSymbol).to.equal(tokenSymbolv2);
      expect(tokenURI).to.equal(tokenURIv2);
      expect(stakedBalance).to.equal(stakedBalancev2);
      expect(dimoTotalAmountStakedVal).to.equal(dimoTotalAmountStakedValv2);
      expect(minStakeVal).to.equal(minStakeValv2);
      expect(bool).to.equal(boolv2);
      expect(LicenseBalance).to.equal(LicenseBalancev2);
    });
  });
});
