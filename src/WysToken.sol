/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

pragma solidity ^0.4.17;

import "./StandardToken.sol";
import "./Ownable.sol";
import "./TokenSale.sol";

contract WysToken is StandardToken, Ownable {
    string public constant name = "wys Token";
    string public constant symbol = "WYS";
    uint8 public constant decimals = 18;
    string public version = "1.0";

    uint256 public totalSupply;
    TokenSale internal issuingTokenSale;

    function WysToken(TokenSale _issuingTokenSale, uint256 _totalSupply) public {
        issuingTokenSale = _issuingTokenSale;

        totalSupply = _totalSupply;
        balances[owner] = totalSupply;
    }

    modifier canTransfer() {
        require(isTradeable() || msg.sender == owner);
        _;
    }

    function isTradeable() public constant returns (bool) {
        return issuingTokenSale.hasEnded();
    }

    function transfer(address _to, uint256 _value) canTransfer() public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) canTransfer() public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }
}