/**
 * Copyright (c) 2017 wysker UG (haftungsbeschränkt)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import solc from "solc";
import fs from "fs";
import crypto from "crypto";

function contractNameToFileName(contractName) {
    return contractName.replace("/", "_").replace(":", "-");
}

// Lazily compile contracts only if they have changed
export function lazyCompileContracts() {
    const hashesFileName = "temp/hashes.txt";
    let oldHashes = {};

    if (fs.existsSync(hashesFileName)) {
        oldHashes = JSON.parse(fs.readFileSync(hashesFileName, "utf8").toString());
    }

    const sources = {};
    const newHashes = {};
    let needsCompiling = false;

    const sourceFiles = fs.readdirSync("src/");
    sourceFiles.forEach(fileName => {
        if (fileName.endsWith(".sol")) {
            const canonicalName = "src/" + fileName;
            const body = fs.readFileSync(canonicalName, "utf8").toString();
            const hash = crypto.createHash("md5").update(body).digest("hex");

            if (typeof oldHashes[canonicalName] === "undefined" ||
                oldHashes[canonicalName] !== hash) {
                needsCompiling = true;
            }

            newHashes[canonicalName] = hash;
            sources[canonicalName] = body;
        }
    });

    if (!fs.existsSync("temp/")){
        fs.mkdirSync("temp/");
    }

    fs.writeFileSync(hashesFileName, JSON.stringify(newHashes));

    if (needsCompiling) {
        const compiled = solc.compile({sources: sources}, 1);
        const compiledContracts = compiled.contracts;

        should.equal(compiled.errors, undefined);
        Object.keys(compiledContracts).forEach(key => {
            const fileName = contractNameToFileName(key);

            fs.writeFileSync("temp/" + fileName + ".abi", compiledContracts[key].interface);
            fs.writeFileSync("temp/" + fileName + ".bin", compiledContracts[key].bytecode);
        });
    }
}

const abiCache = {};
const bytecodeCache = {};

export function deployContract(web3, sender, name, args) {
    return new Promise((resolve, reject) => {
        const fileName = contractNameToFileName(name);

        let abi;
        let bytecode;

        if (typeof abiCache[fileName] !== "undefined") {
            abi = abiCache[fileName];
        } else {
            abi = fs.readFileSync("temp/" + fileName + ".abi", "utf8").toString();
            abiCache[fileName] = abi;
        }

        if (typeof bytecodeCache[fileName] !== "undefined") {
            bytecode = bytecodeCache[fileName];
        } else {
            bytecode = fs.readFileSync("temp/" + fileName + ".bin", "utf8").toString();
            bytecodeCache[fileName] = bytecode;
        }

        const contract = web3.eth.contract(JSON.parse(abi));
        const argList = args.concat([{
            from: sender,
            data: bytecode,
            gas: 4200000,
            arguments: args
        }, (err, contract) => {
            should.equal(err, null);

            // This callback fires twice and the contract is only deployed when the address
            // field of the contract is set.
            if (contract.address) {
                resolve(contract);
            }
        }]);

        contract.new.apply(contract, argList);
    });
}

export function increaseTime(web3, seconds) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0", method: "evm_increaseTime",
            params: [parseInt(seconds)], id: new Date().getTime()
        }, err => {
            web3.currentProvider.sendAsync({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0}, err => {
                resolve();
            });
        });
    });
}