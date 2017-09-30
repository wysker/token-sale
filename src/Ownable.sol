/**
 * Adapted from OpenZeppelin (https://github.com/OpenZeppelin)
 * Copyright (c) 2016 Smart Contract Solutions, Inc.
 * Used under an MIT License
 */

pragma solidity ^0.4.17;

contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function Ownable() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) onlyOwner public {
        require(newOwner != address(0));
        OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}