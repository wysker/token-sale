/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "chai/register-should";
import Web3 from "web3";
import fs from "fs";
import TestRPC from "ethereumjs-testrpc";
import BigNumber from "bignumber.js";
import {lazyCompileContracts, deployContract, increaseTime} from "./utils.js";

const wysToAttoWys = new BigNumber(10).toPower(18);
const days = 24 * 60 * 60;
const now = new Date().getTime() / 1000;
const presaleStart = parseInt(now + 7 * days); // In seven days
const tokenSaleStart = presaleStart + 28 * days;
const tokenSaleEnd = tokenSaleStart + 28 * days;

describe("TokenSale", () => {
    let web3;
    let accounts;

    let contractCreatorAddress;
    let wyskerTeamWalletAddress;
    let buyerAddress;
    let recipientAddress;
    let otherRecipientAddress;
    let secondBuyerAddress;

    function assertGetters(contract, assertions) {
        let promise = Promise.resolve();

        Object.keys(assertions).forEach(key => {
           promise = promise.then(() => {
               return new Promise((resolve, reject) => {
                   contract[key].apply(contract, [{from: accounts[0]}, (err, value) => {
                       should.equal(err, null);
                       assertions[key](value);
                       resolve();
                   }]);
               });
           });
        });

        return promise;
    }

    function getTokenContract(contract) {
        return new Promise((resolve, reject) => {
            contract.token({from: contractCreatorAddress}, (err, value) => {
                should.equal(err, null);

                const abi = fs.readFileSync("temp/src_WysToken.sol-WysToken.abi", "utf8").toString();
                resolve(web3.eth.contract(JSON.parse(abi)).at(value));
            });
        });
    }

    function getBalance(address) {
        return new Promise((resolve, reject) => {
            web3.eth.getBalance(address, (err, value) => {
                should.equal(err, null);
                resolve(value);
            });
        });
    }

    function getWysBalance(tokenContract, address) {
        return new Promise((resolve, reject) => {
            tokenContract.balanceOf(address, {from: contractCreatorAddress}, (err, value) => {
                should.equal(err, null);

                resolve(value);
            });
        });
    }

    before(function (done) {
        this.timeout(60000);

        lazyCompileContracts();

        web3 = new Web3();
        web3.setProvider(TestRPC.provider({
            accounts: [
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"},
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"},
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"},
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"},
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"},
                {balance: "FFFFFFFFFFFFFFFFFFFFFFFFFF"}
            ]
        }));

        web3.eth.getAccounts((err, result) => {
            should.equal(err, null);

            accounts = result;

            contractCreatorAddress = accounts[0];
            wyskerTeamWalletAddress = accounts[1];
            buyerAddress = accounts[2];
            recipientAddress = accounts[3];
            otherRecipientAddress = accounts[4];
            secondBuyerAddress = accounts[5];

            done();
        });
    });

    describe("Newly created", () => {
        let subject;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;
                done();
            });
        })

        it("should be correctly initialized", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                decimals: value => value.toNumber().should.equal(18),
                tokenSupply: value => new BigNumber(3000000000).times(wysToAttoWys).equals(value).should.be.true,
                tokensForSale: value => new BigNumber(1782692308).times(wysToAttoWys).equals(value).should.be.true,
                tokensForSaleDuringPresale: value => new BigNumber(500000000).times(wysToAttoWys).equals(value).should.be.true,
                baseExchangeRate: value => value.toNumber().should.equal(13941),
                presaleStart: value => value.toNumber().should.equal(presaleStart),
                presaleEnd: value => value.toNumber().should.equal(tokenSaleStart),
                tokenSaleStart: value => value.toNumber().should.equal(tokenSaleStart),
                tokenSaleEnd: value => value.toNumber().should.equal(tokenSaleEnd),
                presaleBonusPercent: value => value.toNumber().should.equal(30),

                totalWeiRaised: value => value.toNumber().should.equal(0),
                weiRaisedDuringPresale: value => value.toNumber().should.equal(0),
                totalTokensSold: value => value.toNumber().should.equal(0),
                tokensSoldDuringPresale: value => value.toNumber().should.equal(0),
                totalUniqueBuyers: value => value.toNumber().should.equal(0),
                uniqueBuyersDuringPresale: value => value.toNumber().should.equal(0),

                receivingMultisigWallet: value => value.should.equal(wyskerTeamWalletAddress),
                tokensRemainingInStage: value => new BigNumber(500000000).times(wysToAttoWys).equals(value).should.be.true,
                currentBonusPercent: value => value.toNumber().should.equal(30),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 130) / 100)),
                isPresale: value => value.should.be.true,
                hasStarted: value => value.should.be.false,
                hasEnded: value => value.should.be.false,
                hasHardCapBeenReached: value => value.should.be.false,

                owner: value => value.should.equal(contractCreatorAddress)
            }).then(done);
        });
    });

    describe("Before presale", () => {
        let subject;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;
                done();
            });
        })

        it("should report that it hasn't started", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                hasStarted: value => value.should.be.false,
            }).then(done);
        });

        it("should not allow purchases", function (done) {
            this.timeout(60000);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(1, "ether"),
                gas: 200000
            }, (err, value) => {
                should.not.equal(err, null);
                done();
            });
        });
    });

    describe("During presale", () => {
        let subject;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;

                increaseTime(web3, presaleStart - now).then(done);
            });
        })

        it("should report correct parameters", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                isPresale: value => value.should.be.true,
                hasStarted: value => value.should.be.true,
                hasEnded: value => value.should.be.false,
                tokensRemainingInStage: value => new BigNumber(500000000).times(wysToAttoWys).equals(value).should.be.true,
                currentBonusPercent: value => value.toNumber().should.equal(30),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 130) / 100)),
            }).then(done);
        });

        it("should allow purchases", function (done) {
            this.timeout(60000);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(1, "ether"),
                gas: 300000
            }, (err, value) => {
                should.equal(err, null);
                done();
            });
        });

        it ("should not allow tokens to be transfered", function (done) {
            this.timeout(60000);

            getTokenContract(subject).then(tokenContract => {
                tokenContract.transfer(otherRecipientAddress, 100, {from: recipientAddress, gas: 300000}, (error, value) => {
                    should.not.equal(error, null);
                    done();
                });
            });
        });

        it ("should not allow exceeding the presale cap", function (done) {
            this.timeout(60000);

            let presaleExchangeRate = new BigNumber(parseInt((13941 * 130) / 100));
            let etherToExceedCap = new BigNumber(500000001).div(presaleExchangeRate);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(etherToExceedCap.toNumber(), "ether"),
                gas: 300000
            }, (err, value) => {
                should.not.equal(err, null);
                done();
            });
        })

        it ("should allow matching the presale cap", function (done) {
            this.timeout(60000);

            let presaleExchangeRate = new BigNumber(parseInt((13941 * 130) / 100));
            let etherToMatchCap = new BigNumber(500000000).minus(presaleExchangeRate).div(presaleExchangeRate);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(parseInt(etherToMatchCap.toNumber()), "ether"),
                gas: 300000
            }, (err, value) => {
                should.equal(err, null);
                done();
            });
        })
    });

    describe("During token sale", () => {
        let subject;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;

                increaseTime(web3, tokenSaleStart - presaleStart).then(done);
            });
        })

        it("should report correct parameters", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                tokensRemainingInStage: value => new BigNumber(1782692308).times(wysToAttoWys).equals(value).should.be.true,
                currentBonusPercent: value => value.toNumber().should.equal(15),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 115) / 100)),
                isPresale: value => value.should.be.false,
                hasStarted: value => value.should.be.true,
                hasEnded: value => value.should.be.false,
                hasHardCapBeenReached: value => value.should.be.false
            }).then(done);
        });

        it("should allow purchases", function (done) {
            this.timeout(60000);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(1, "ether"),
                gas: 300000
            }, (err, value) => {
                should.equal(err, null);
                done();
            });
        });

        it ("should correctly update balances during a purchase", function (done) {
            this.timeout(60000);

            let initialBalances = {
                wyskerTeamWei: 0,
                wyskerTeamTokens: 0,
                recipientTokens: 0,
                buyerWei: 0
            };

            let newBalances = {
                wyskerTeamWei: 0,
                wyskerTeamTokens: 0,
                recipientTokens: 0,
                buyerWei: 0
            };

            let tokenContract;

            getBalance(wyskerTeamWalletAddress).then(balance => {
                initialBalances.wyskerTeamWei = balance;
                return getBalance(buyerAddress);
            }).then(balance => {
                initialBalances.buyerWei = balance;
                return getTokenContract(subject);
            }).then(contract => {
                tokenContract = contract;
                return getWysBalance(tokenContract, contractCreatorAddress);
            }).then(balance => {
                initialBalances.wyskerTeamTokens = balance;
                return getWysBalance(tokenContract, recipientAddress);
            }).then(balance => {
                initialBalances.recipientTokens = balance;

                return new Promise((resolve, reject) => {
                    subject.buyTokens.sendTransaction(recipientAddress, {
                        from: buyerAddress,
                        value: web3.toWei(1, "ether"),
                        gas: 300000
                    }, (err, value) => {
                        should.equal(err, null);
                        resolve();
                    });
                });
            }).then(() => {
                return getBalance(wyskerTeamWalletAddress);
            }).then(balance => {
                newBalances.wyskerTeamWei = balance;
                return getBalance(buyerAddress);
            }).then(balance => {
                newBalances.buyerWei = balance;
                return getWysBalance(tokenContract, contractCreatorAddress);
            }).then(balance => {
                newBalances.wyskerTeamTokens = balance;
                return getWysBalance(tokenContract, recipientAddress);
            }).then(balance => {
                newBalances.recipientTokens = balance;
            }).then(() => {
                let expectedTokensPerWei = new BigNumber(parseInt((13941 * 115) / 100));

                newBalances.wyskerTeamWei.equals(initialBalances.wyskerTeamWei.add(web3.toWei(1, "ether"))).should.be.true;
                // FIXME! Unfortunately TestRPC does not correctly update the sender's ETH balance even after
                // mining explicitly
                //newBalances.buyerWei.equals(initialBalances.buyerWei.minus(web3.toWei(1, "ether"))).should.be.true;
                newBalances.wyskerTeamTokens.equals(initialBalances.wyskerTeamTokens.minus(expectedTokensPerWei.times(wysToAttoWys))).should.be.true;
                newBalances.recipientTokens.equals(initialBalances.recipientTokens.plus(expectedTokensPerWei.times(wysToAttoWys))).should.be.true;

                done();
            });
        });

        it("should not allow purchases when paused", function (done) {
            this.timeout(60000);

            subject.pause.sendTransaction({from: contractCreatorAddress}, (err, value) => {
                should.equal(err, null);

                subject.buyTokens.sendTransaction(recipientAddress, {
                    from: buyerAddress,
                    value: web3.toWei(1, "ether"),
                    gas: 300000
                }, (err, value) => {
                    should.not.equal(err, null);
                    done();
                });
            });
        });

        it("should allow purchases when resumed", function (done) {
            this.timeout(60000);

            subject.resume.sendTransaction({from: contractCreatorAddress}, (err, value) => {
                should.equal(err, null);

                subject.buyTokens.sendTransaction(recipientAddress, {
                    from: buyerAddress,
                    value: web3.toWei(1, "ether"),
                    gas: 300000
                }, (err, value) => {
                    should.equal(err, null);
                    done();
                });
            });
        });

        it("should correctly track statistics", function (done) {
            this.timeout(60000);

            let totalWeiRaised;
            let totalTokensSold;
            let totalUniqueBuyers;

            let expectedWysTokens = new BigNumber(parseInt((13941 * 115) / 100)).times(wysToAttoWys).times(5);

            assertGetters(subject, {
                totalWeiRaised: value => totalWeiRaised = value,
                totalTokensSold: value => totalTokensSold = value,
                totalUniqueBuyers: value => totalUniqueBuyers = value
            }).then(() => {
                return new Promise((resolve, reject) => {
                    subject.buyTokens.sendTransaction(recipientAddress, {
                        from: secondBuyerAddress,
                        value: web3.toWei(5, "ether"),
                        gas: 300000
                    }, (err, value) => {
                        should.equal(err, null);
                        resolve();
                    });
                });
            }).then(() => {
                return assertGetters(subject, {
                    totalWeiRaised: value => {
                        value.equals(totalWeiRaised.add(web3.toWei(5, "ether"))).should.be.true
                    },
                    totalTokensSold: value => {
                        value.equals(totalTokensSold.add(expectedWysTokens)).should.be.true
                    },
                    totalUniqueBuyers: value => {
                        value.equals(totalUniqueBuyers.plus(1)).should.be.true
                    }
                });
            }).then(done)
        });

        it ("should not allow tokens to be transfered", function (done) {
            this.timeout(60000);

            getTokenContract(subject).then(tokenContract => {
                tokenContract.transfer(otherRecipientAddress, 100, {from: recipientAddress, gas: 300000}, (error, value) => {
                    should.not.equal(error, null);
                    done();
                });
            });
        });

        it ("should not allow exceeding the ether cap", function (done) {
            this.timeout(60000);

            subject.totalWeiRaised({from: contractCreatorAddress}, (error, raised) => {
                should.equal(error, null);

                subject.hardCap({from: contractCreatorAddress}, (error, hardCap) => {
                    should.equal(error, null);

                    let weiRemaining = hardCap.minus(raised).plus(1);

                    subject.buyTokens.sendTransaction(recipientAddress, {
                        from: buyerAddress,
                        value: weiRemaining,
                        gas: 300000
                    }, (err, value) => {
                        should.not.equal(err, null);
                        done();
                    });
                });
            });
        })

        it ("should allow matching the ether cap", function (done) {
            this.timeout(60000);

            subject.totalWeiRaised({from: contractCreatorAddress}, (error, raised) => {
                should.equal(error, null);

                subject.hardCap({from: contractCreatorAddress}, (error, hardCap) => {
                    should.equal(error, null);

                    let weiRemaining = hardCap.minus(raised);

                    subject.buyTokens.sendTransaction(recipientAddress, {
                        from: buyerAddress,
                        value: weiRemaining,
                        gas: 300000
                    }, (err, value) => {
                        should.equal(err, null);
                        done();
                    });
                });
            });
        })
    });

    describe("Token sale bonuses", () => {
        let subject;
        let timeIncrease = 7 * days;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;
                done();
            });
        });

        afterEach(function (done) {
            this.timeout(60000);

            increaseTime(web3, timeIncrease).then(done);
        });

        it("should report 15% discount in the first week", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                currentBonusPercent: value => value.toNumber().should.equal(15),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 115) / 100))
            }).then(done);
        });

        it("should report 10% discount in the second week", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                currentBonusPercent: value => value.toNumber().should.equal(10),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 110) / 100))
            }).then(done);
        });

        it("should report 5% discount in the third week", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                currentBonusPercent: value => value.toNumber().should.equal(5),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt((13941 * 105) / 100))
            }).then(done);
        });

        it("should report 0% discount in the fourth week", function (done) {
            this.timeout(60000);
            timeIncrease = 0;

            assertGetters(subject, {
                currentBonusPercent: value => value.toNumber().should.equal(0),
                currentExchangeRate: value => value.toNumber().should.equal(parseInt(13941))
            }).then(done);
        });
    });

    describe("After token sale", () => {
        let subject;

        before(function (done) {
            this.timeout(60000);

            deployContract(web3, contractCreatorAddress, "src/TokenSale.sol:TokenSale",
                [presaleStart, tokenSaleStart, tokenSaleEnd, wyskerTeamWalletAddress]).then(contract => {
                subject = contract;

                // Make sure the recipient has some tokens before we change the time to after the end of the token sale
                subject.buyTokens.sendTransaction(recipientAddress, {
                    from: buyerAddress,
                    value: web3.toWei(1, "ether"),
                    gas: 300000
                }, (err, value) => {
                    should.equal(err, null);

                    increaseTime(web3, 7 * days).then(done);
                });
            });
        });

        it("should be correctly initialized", function (done) {
            this.timeout(60000);

            assertGetters(subject, {
                currentBonusPercent: value => value.toNumber().should.equal(0),
                currentExchangeRate: value => value.toNumber().should.equal(13941),
                isPresale: value => value.should.be.false,
                hasStarted: value => value.should.be.true,
                hasEnded: value => value.should.be.true,
                hasHardCapBeenReached: value => value.should.be.false
            }).then(done);
        });

        it("should not allow purchases", function (done) {
            this.timeout(60000);

            subject.buyTokens.sendTransaction(recipientAddress, {
                from: buyerAddress,
                value: web3.toWei(1, "ether"),
                gas: 200000
            }, (err, value) => {
                should.not.equal(err, null);
                done();
            });
        });

        it ("should allow tokens to be transfered", function (done) {
            this.timeout(60000);

            let initialBalance = 0;
            let tokenContract;

            getTokenContract(subject).then(contract => {
                tokenContract = contract;

                return getWysBalance(tokenContract, otherRecipientAddress);
            }).then(balance => {
                initialBalance = balance;

                return new Promise((resolve, reject) => {
                    tokenContract.transfer(otherRecipientAddress, 100, {from: recipientAddress, gas: 300000}, (error, value) => {
                       should.equal(error, null);
                       resolve();
                    });
                });
            }).then(() => {
                return getWysBalance(tokenContract, otherRecipientAddress);
            }).then(balance => {
                balance.equals(initialBalance.add(100)).should.be.true;
                done();
            });
        });
    });
});