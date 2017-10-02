/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

pragma solidity ^0.4.16;

import "./StandardToken.sol";
import "./Ownable.sol";
import "./TokenSale.sol";

contract WysToken is StandardToken, Ownable {
    string public constant name = "wys Token";
    string public constant symbol = "WYS";
    uint8 public constant decimals = 18;
    string public version = "1.0";

    address internal wyskerTeam;
    uint256 public totalSupply;
    TokenSale internal issuingTokenSale;

    function WysToken(TokenSale _issuingTokenSale, uint256 _totalSupply, address _wyskerTeam) public {
        issuingTokenSale = _issuingTokenSale;

        wyskerTeam = _wyskerTeam;
        totalSupply = _totalSupply;
        balances[wyskerTeam] = totalSupply;
    }

    function issueTokens(address _to, uint256 _value) onlyOwner public returns (bool) {
        require(_to != address(0));
        require(_value <= balances[wyskerTeam]);

        balances[wyskerTeam] = balances[wyskerTeam].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    modifier canTransfer() {
        require(isTradeable() || msg.sender == owner);
        _;
    }

    function isTradeable() public constant returns (bool) {
        return issuingTokenSale.hasEnded();
    }

    function transfer(address _to, uint256 _value) canTransfer public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) canTransfer public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }
}