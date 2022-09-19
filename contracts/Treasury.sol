// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Treasury is Ownable {
    uint256 public totalFunds;
    address public payee;
    bool public isReleased;

    constructor(address _payee) payable {
        payee = _payee;
        totalFunds += msg.value;
    }

    function releaseFunds() public onlyOwner {
        isReleased;
        payable(payee).transfer(totalFunds);
    }
}
