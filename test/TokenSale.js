/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import "chai/register-should";
import solc from "solc";
import fs from "fs";
import Web3 from "web3";
import TestRPC from "ethereumjs-testrpc";

describe("TokenSale", () => {
    let web3;
    let accounts;
    let subject;

    before(function (done) {
        this.timeout(10000);

        const sources = {};

        const sourceFiles = fs.readdirSync("src/");
        sourceFiles.forEach(fileName => {
            if (fileName.endsWith(".sol")) {
                sources["src/" + fileName] = fs.readFileSync("src/" + fileName, "utf8").toString();
            }
        });

        const compiled = solc.compile({sources: sources }, 1);
        const compiledContracts = compiled.contracts;

        should.equal(compiled.errors, undefined);

        web3 = new Web3();
        web3.setProvider(TestRPC.provider());

        web3.eth.getAccounts((err, result) => {
            should.equal(err, null);

            accounts = result;

            const contractToDeploy = compiledContracts["src/TokenSale.sol:TokenSale"];

            web3.eth.contract(JSON.parse(contractToDeploy.interface)).new({
                from: accounts[0],
                data: contractToDeploy.bytecode,
                gas: 4000000
            }, (err, contract) => {
                should.equal(err, null);

                // This callback fires twice and the contract is only deployed when the address
                // field of the contract is set.
                if (contract.address) {
                    subject = contract;
                    done();
                }
            });
        });
    });

    it("should do something else", done => {
        subject.tokensPerEther({ from: accounts[0] }, (err, value) => {
            console.log(err);
            console.log(value);
            done();
        });
    });
});