//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IStake {
    function checkUserIsWhitelisted(address user) external view returns (bool);
}
