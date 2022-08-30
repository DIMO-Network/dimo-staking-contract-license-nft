//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract Dimo is ERC20Pausable {
    constructor(address addressToFund) ERC20("Dimo", "DIMO") {
        _mint(addressToFund, 100000000 * 10**18);
    }

    function pause() external {
        _pause();
    }

    function unpause() external {
        _unpause();
    }
}
