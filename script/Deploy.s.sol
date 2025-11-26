// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/Marketplace.sol";

contract DeployScript is Script {
    function run() external returns (address) {
        vm.startBroadcast();
        Marketplace m = new Marketplace();
        vm.stopBroadcast();
        return address(m);
    }
}
