//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../Stake.sol";

contract StakeV2 is Stake {
    function helloWorld() public view returns (string memory) {
        return "Hello World";
    }
}
