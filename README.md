# wys Token and Token Sale Contracts

## Intoduction
This repository contains the contracts for the wys ERC20 Token and the wys Token Sale. Please refer to the resources below to learn more about the wys Token and the wysker app it powers.

  - [Token Sale Website](https://www.wystoken.org)
  - [wysker App Website](https://www.wysker.com)
  - [Read the Whitepaper](https://www.wystoken.org/media/whitepaper.pdf)

# Overview
Here is what you will find in this repository:

| Resource | Purpose |
| ------ | ------ |
| src | Solidity contracts |
| \|- ERC20.sol | The ERC20 interface |
| \|- Ownable.sol | Adapted from [Open Zeppelin](https://github.com/OpenZeppelin), this reprents a contract that can be owned |
| \|- Pausable.sol | Adapted from [Open Zeppelin](https://github.com/OpenZeppelin), this reprents a contract that can be paused and resumed |
| \|- SafeMath.sol | Adapted from [Open Zeppelin](https://github.com/OpenZeppelin), library that provides overflow-safe arithmetic |
| \|- StandardToken.sol | Adapted from [Open Zeppelin](https://github.com/OpenZeppelin), implements the basic ERC20 functionality |
| \|- TokenSale.sol | Implements the logic of the wys Token Sale |
| \|- WysToken.sol | Dervied from StandardToken.sol, this implements functionality specific to the wys Token |
| test | Unit tests |
| \|- TokenSale.js | Test suite for TokenSale.sol and WysToken.sol |
| \|- utils.js | Helper functions for compiling and deploying Solidity contracts for TestRPC |

# Testing
To test these contracts, please make sure you have the "mocha" node module installed globally (using the -g flag)

You can run the test suite via

```sh
$ npm test
```

# Contact us
Please get in touch with us! We'd love to hear your thoughts!

- Email: contact@wysker.com
- Slack: https://goo.gl/forms/VxK4S4K3XZc7P69X2