/**
 * Adapted from OpenZeppelin (https://github.com/OpenZeppelin)
 * Copyright (c) 2016 Smart Contract Solutions, Inc.
 * Used under an MIT License
 */

pragma solidity ^0.4.16;

import "./Ownable.sol";

contract Pausable is Ownable {
    event Paused();
    event Resumed();

    bool public paused = false;

    modifier whenNotPaused() {
        require(!paused);
        _;
    }

    modifier whenPaused() {
        require(paused);
        _;
    }

    function pause() onlyOwner whenNotPaused public {
        paused = true;
        Paused();
    }

    function resume() onlyOwner whenPaused public {
        paused = false;
        Resumed();
    }
}