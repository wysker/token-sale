/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

pragma solidity ^0.4.16;

contract TokenSaleMock {
    uint256 public constant decimals = 18; // One atto-wys = 10^-18 wys

    // Token sale terms
    uint256 public constant hardCap = 107596 ether;
    uint256 public constant tokenSupply = 3000000000 * (10**decimals);
    uint256 public constant tokensForSale = 1782692308 * (10**decimals);
    uint256 public constant tokensForSaleDuringPresale = 500000000 * (10**decimals);
    uint256 public constant exchangeRate = 13941; // atto-wys per one wei

    // Timing
    uint256 public presaleStartTime = 1506866400; // 10/01/2017 @ 2:00pm (UTC)
    uint256 public tokenSaleStartTime = 1509544800; // 11/01/2017 @ 2:00pm (UTC)
    uint256 public tokenSaleEndTime = 1512136800; //12/01/2017 @ 2:00pm (UTC)

    // Bonus
    uint8 public constant presaleBonusPercent = 30;
    uint8[] public tokenSaleBonusPercentByWeek = [15, 10, 5, 0];

    // Statistics
    uint256 public weiRaised = 150 ether;
    uint256 public weiRaisedDuringPresale = 50 ether;
    uint256 public tokensSold = (tokensForSale * 50) / 100;
    uint256 public tokensSoldDuringPresale = (tokensForSale * 20) / 100;
    uint256 public buyerCount = 482939;
    uint256 public presaleBuyerCount = 3234;

    address public receivingMultisigWallet; // Wysker team multisig wallet to receive the funds

    address public token;

    address internal temp;

    function TokenSaleMock() public {
    }

    function () external payable {
        buyTokens(msg.sender);
    }

    function buyTokens(address tokenReceiver) public payable {
        assert(false);
        temp = tokenReceiver;
    }

    function currentTokensAvailable() public constant returns (uint256) {
        return tokensForSale - tokensSold;
    }

    function currentBonus() public constant returns (uint256) {
        return 15;
    }

    // atto-wys per wei
    function currentExchangeRate() public constant returns (uint256) {
        return (exchangeRate * (currentBonus() + 100)) / 100;
    }

    function isPresale() public constant returns (bool) {
        return false;
    }

    function hasStarted() public constant returns (bool) {
        return true;
    }

    function hasEnded() public constant returns (bool) {
        return false;
    }

    function hasHardCapBeenReached() public constant returns (bool) {
        return false;
    }
}