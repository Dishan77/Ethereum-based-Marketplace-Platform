// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/MarketplaceV2.sol";

contract DeployV2Script is Script {
    function run() external returns (address) {
        vm.startBroadcast();
        
        MarketplaceV2 marketplace = new MarketplaceV2();
        
        vm.stopBroadcast();
        
        return address(marketplace);
    }
}
