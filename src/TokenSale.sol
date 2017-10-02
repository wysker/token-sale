/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

pragma solidity ^0.4.16;

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
    uint256 public constant baseExchangeRate = 13941; // atto-wys per one wei

    // Timing
    uint256 public presaleStart;
    uint256 public presaleEnd;
    uint256 public tokenSaleStart;
    uint256 public tokenSaleEnd;

    // Bonus
    uint8 public constant presaleBonusPercent = 30;
    uint8[] public tokenSaleBonusPercentByWeek = [15, 10, 5, 0];

    // Statistics
    uint256 public totalWeiRaised = 0;
    uint256 public weiRaisedDuringPresale = 0;
    uint256 public totalTokensSold = 0;
    uint256 public tokensSoldDuringPresale = 0;
    uint256 public totalUniqueBuyers = 0;
    uint256 public uniqueBuyersDuringPresale = 0;
    mapping(address => bool) knownBuyers; // Keeps track of which buyers have already made a purchase to avoid double-counting

    address public receivingMultisigWallet; // Wysker team multisig wallet to receive the funds

    WysToken public token;

    // Events
    event TokensPurchased(address indexed purchaser, address indexed receiver, uint256 amount);

    function TokenSale(uint256 _presaleStart, uint256 _tokenSaleStart,
        uint256 _tokenSaleEnd, address _receivingMultisigWallet) public {
        require(_presaleStart >= 0);
        require(_tokenSaleStart > _presaleStart);
        require(_tokenSaleEnd > _tokenSaleStart);
        require(_receivingMultisigWallet != address(0));

        presaleStart = _presaleStart;
        tokenSaleStart = _tokenSaleStart;
        presaleEnd = tokenSaleStart; // Presale ends with main sale start
        tokenSaleEnd = _tokenSaleEnd;
        receivingMultisigWallet = _receivingMultisigWallet;

        token = new WysToken(this, tokenSupply, msg.sender);
    }

    function () external payable {
        buyTokens(msg.sender);
    }

    function buyTokens(address tokenReceiver) whenNotPaused public payable {
        require(validPurchase());

        uint256 weiAmount = msg.value;
        uint256 tokensPerWei = currentExchangeRate();
        uint256 tokensToBePurchased = weiAmount.mul(tokensPerWei);
        uint256 tokensAvailable = tokensRemainingInStage();

        assert(tokensToBePurchased <= tokensAvailable);

        // Update statistics
        recordWeiReceived(weiAmount);
        recordTokensSold(tokensToBePurchased);
        recordPotentialNewBuyer();

        token.issueTokens(tokenReceiver, tokensToBePurchased);

        forwardFunds();

        TokensPurchased(msg.sender, tokenReceiver, tokensToBePurchased);
    }

    // Statistics
    function recordWeiReceived(uint256 weiAmount) internal {
        totalWeiRaised = totalWeiRaised.add(weiAmount);

        if (isPresale()) {
            weiRaisedDuringPresale = weiRaisedDuringPresale.add(weiAmount);
        }
    }

    function recordTokensSold(uint256 tokenAmount) internal {
        totalTokensSold = totalTokensSold.add(tokenAmount);

        if (isPresale()) {
            tokensSoldDuringPresale = tokensSoldDuringPresale.add(tokenAmount);
        }
    }

    function recordPotentialNewBuyer() internal {
        bool isKnownBuyer = knownBuyers[msg.sender];

        if (!isKnownBuyer) {
            knownBuyers[msg.sender] = true;
            totalUniqueBuyers = totalUniqueBuyers.add(1);

            if (isPresale()) {
                uniqueBuyersDuringPresale = uniqueBuyersDuringPresale.add(1);
            }
        }
    }

    function forwardFunds() internal {
        receivingMultisigWallet.transfer(msg.value);
    }

    function validPurchase() internal constant returns (bool) {
        bool hasEther = msg.value > 0;
        uint256 weiAmount = msg.value;

        bool isWithinHardCap = totalWeiRaised.add(weiAmount) <= hardCap;

        return hasStarted() &&
        !hasEnded() &&
        hasEther &&
        isWithinHardCap;
    }

    function tokensRemainingInStage() public constant returns (uint256) {
        uint256 initialTokensAvailable;

        if (isPresale()) {
            initialTokensAvailable = tokensForSaleDuringPresale;
        } else {
            initialTokensAvailable = tokensForSale;
        }

        return initialTokensAvailable.sub(totalTokensSold);
    }

    function currentBonusPercent() public constant returns (uint256) {
        uint256 bonus;

        if (isPresale()) {
            bonus = presaleBonusPercent;
        } else if (now < tokenSaleStart + 7 days) {
            bonus = tokenSaleBonusPercentByWeek[0];
        } else if (now < tokenSaleStart + 14 days) {
            bonus = tokenSaleBonusPercentByWeek[1];
        } else if (now < tokenSaleStart + 21 days) {
            bonus = tokenSaleBonusPercentByWeek[2];
        } else {
            bonus = tokenSaleBonusPercentByWeek[3];
        }

        return bonus;
    }

    // atto-wys per wei
    function currentExchangeRate() public constant returns (uint256) {
        return (baseExchangeRate.mul(currentBonusPercent().add(100))).div(100);
    }

    function isPresale() public constant returns (bool) {
        return now < presaleEnd;
    }

    function hasStarted() public constant returns (bool) {
        return now >= presaleStart;
    }

    function hasEnded() public constant returns (bool) {
        return hasHardCapBeenReached() ||
        now > tokenSaleEnd;
    }

    function hasHardCapBeenReached() public constant returns (bool) {
        return totalWeiRaised >= hardCap;
    }
}