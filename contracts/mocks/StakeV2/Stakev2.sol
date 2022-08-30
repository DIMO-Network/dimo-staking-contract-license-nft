//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../Stake.sol";

contract StakeV2 is Stake {
    string public v2variable;

    function helloWorld() public view returns (string memory) {
        return "Hello World";
    }

    function test() public {
        v2variable = "test";
    }
}
