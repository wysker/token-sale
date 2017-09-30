/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

pragma solidity ^0.4.17;

import "./WysToken.sol";
import "./SafeMath.sol";
import "./Ownable.sol";
import "./Pausable.sol";

contract TokenSale is Ownable, Pausable {
    using SafeMath for uint256;

    uint256 public constant decimals = 18; // One atto-wys = 10^-18 wys

    // Token sale terms
    uint256 public constant hardCap = 107596 ether;
    uint256 public constant tokenSupply = 3000000000 * (10**decimals);
    uint256 public constant tokensForSale = 1782692308 * (10**decimals);
    uint256 public constant tokensForSaleDuringPresale = 500000000 * (10**decimals);
    uint256 public constant exchangeRate = 13941; // atto-wys per one wei

    // Timing
    uint256 public presaleStartTime;
    uint256 public tokenSaleStartTime; // Presale ends with main sale start
    uint256 public tokenSaleEndTime;

    // Bonus
    uint8 public constant presaleBonusPercent = 30;
    uint8[] public tokenSaleBonusPercentByWeek = [15, 10, 5, 0];

    // Statistics
    uint256 public weiRaised = 0;
    uint256 public weiRaisedDuringPresale = 0;
    uint256 public tokensSold = 0;
    uint256 public tokensSoldDuringPresale = 0;
    uint256 public buyerCount = 0;
    uint256 public presaleBuyerCount = 0;
    mapping(address => bool) knownBuyers; // Keeps track of which buyers have already made a purchase to avoid double-counting

    address public receivingMultisigWallet; // Wysker team multisig wallet to receive the funds

    WysToken public token;

    // Events
    event TokensPurchased(address indexed purchaser, address indexed receiver, uint256 amount);

    function TokenSale(uint256 _presaleStartTime, uint256 _tokenSaleStartTime,
        uint256 _tokenSaleEndTime, address _receivingMultisigWallet) public {
        require(_presaleStartTime >= now);
        require(_tokenSaleStartTime >= now && _tokenSaleStartTime > _presaleStartTime);
        require(_tokenSaleEndTime >= now && _tokenSaleEndTime > _tokenSaleStartTime);
        require(_receivingMultisigWallet != address(0));

        presaleStartTime = _presaleStartTime;
        tokenSaleStartTime = _tokenSaleStartTime;
        tokenSaleEndTime = _tokenSaleEndTime;
        receivingMultisigWallet = _receivingMultisigWallet;

        token = new WysToken(this, tokenSupply);
    }

    function () external payable {
        buyTokens(msg.sender);
    }

    function buyTokens(address tokenReceiver) whenNotPaused public payable {
        require(validPurchase());

        uint256 weiAmount = msg.value;
        uint256 tokensPerWei = currentExchangeRate();
        uint256 tokensToBePurchased = weiAmount.mul(tokensPerWei);
        uint256 tokensAvailable = currentTokensAvailable();

        assert(tokensToBePurchased <= tokensAvailable);

        // Update statistics
        recordWeiReceived(weiAmount);
        recordTokensSold(tokensToBePurchased);
        recordPotentialNewBuyer();

        token.transfer(tokenReceiver, tokensToBePurchased);

        forwardFunds();

        TokensPurchased(msg.sender, tokenReceiver, tokensToBePurchased);
    }

    // Statistics
    function recordWeiReceived(uint256 weiAmount) internal {
        weiRaised = weiRaised.add(weiAmount);

        if (isPresale()) {
            weiRaisedDuringPresale = weiRaisedDuringPresale.add(weiAmount);
        }
    }

    function recordTokensSold(uint256 tokenAmount) internal {
        tokensSold = tokensSold.add(tokenAmount);

        if (isPresale()) {
            tokensSoldDuringPresale = tokensSoldDuringPresale.add(tokenAmount);
        }
    }

    function recordPotentialNewBuyer() internal {
        bool isKnownBuyer = knownBuyers[msg.sender];

        if (!isKnownBuyer) {
            knownBuyers[msg.sender] = true;
            buyerCount = buyerCount.add(1);

            if (isPresale()) {
                presaleBuyerCount = presaleBuyerCount.add(1);
            }
        }
    }

    function forwardFunds() internal {
        receivingMultisigWallet.transfer(msg.value);
    }

    function validPurchase() internal constant returns (bool) {
        bool hasEther = msg.value > 0;
        uint256 weiAmount = msg.value;

        bool isWithinHardCap = weiRaised.add(weiAmount) <= hardCap;

        return hasStarted() &&
            !hasEnded() &&
            hasEther &&
            isWithinHardCap;
    }

    function currentTokensAvailable() public constant returns (uint256) {
        uint256 initialTokensAvailable;

        if (isPresale()) {
            initialTokensAvailable = tokensForSaleDuringPresale;
        } else {
            initialTokensAvailable = tokensForSale;
        }

        return initialTokensAvailable.sub(tokensSold);
    }

    function currentBonus() public constant returns (uint256) {
        uint256 bonus;

        if (isPresale()) {
            bonus = presaleBonusPercent;
        } else if (now < tokenSaleStartTime + 7 days) {
            bonus = tokenSaleBonusPercentByWeek[0];
        } else if (now < tokenSaleStartTime + 14 days) {
            bonus = tokenSaleBonusPercentByWeek[1];
        } else if (now < tokenSaleStartTime + 21 days) {
            bonus = tokenSaleBonusPercentByWeek[2];
        } else {
            bonus = tokenSaleBonusPercentByWeek[3];
        }

        return bonus;
    }

    // atto-wys per wei
    function currentExchangeRate() public constant returns (uint256) {
        return (exchangeRate.mul(currentBonus().add(100))).div(100);
    }

    function isPresale() public constant returns (bool) {
        return now < tokenSaleStartTime;
    }

    function hasStarted() public constant returns (bool) {
        return now >= presaleStartTime;
    }

    function hasEnded() public constant returns (bool) {
        return hasHardCapBeenReached() ||
            now > tokenSaleEndTime;
    }

    function hasHardCapBeenReached() public constant returns (bool) {
        return weiRaised >= hardCap;
    }
}