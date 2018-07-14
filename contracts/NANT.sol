pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract NANT is StandardToken {

    string public name = 'Noble Ant';
    string public symbol = 'NANT';
    uint8 public decimals = 18;

    constructor() public {
        totalSupply_ = 1000000000 * 10 ** 18;
        balances[msg.sender] = totalSupply_;
    }
}
