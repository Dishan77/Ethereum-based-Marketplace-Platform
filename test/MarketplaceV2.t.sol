// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/MarketplaceV2.sol";

contract MarketplaceV2Test is Test {
    MarketplaceV2 public marketplace;
    
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public buyer2 = makeAddr("buyer2");
    
    uint256 constant ITEM_PRICE = 1 ether;
    string constant ITEM_NAME = "Handmade Pottery";
    string constant IPFS_HASH = "QmTest123...";
    string constant CONDITION_HASH = "QmCondition123...";
    
    function setUp() public {
        marketplace = new MarketplaceV2();
        
        // Fund accounts
        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(buyer2, 10 ether);
    }
    
    function testListItem() public {
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        assertEq(marketplace.itemCount(), 1);
        
        (
            uint256 id,
            string memory name,
            uint256 price,
            address paySeller,
            address owner,
            bool isSold,
            bool isResale,
            string memory ipfsHash,
            uint256 listedAt
        ) = marketplace.items(1);
        
        assertEq(id, 1);
        assertEq(name, ITEM_NAME);
        assertEq(price, ITEM_PRICE);
        assertEq(paySeller, seller);
        assertEq(owner, seller);
        assertFalse(isSold);
        assertFalse(isResale);
        assertEq(ipfsHash, IPFS_HASH);
        assertTrue(listedAt > 0);
    }
    
    function testPurchaseItem() public {
        // List item
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        uint256 sellerBalanceBefore = seller.balance;
        
        // Purchase item
        vm.prank(buyer);
        marketplace.purchaseItem{value: ITEM_PRICE}(1);
        
        // Check seller received payment
        assertEq(seller.balance, sellerBalanceBefore + ITEM_PRICE);
        
        // Check ownership transferred
        (, , , , address newOwner, bool isSold, , , ) = marketplace.items(1);
        assertEq(newOwner, buyer);
        assertTrue(isSold);
        
        // Check ownership timeline
        MarketplaceV2.OwnershipRecord[] memory timeline = marketplace.getOwnershipTimeline(1);
        assertEq(timeline.length, 2);
        assertEq(timeline[0].owner, seller);
        assertEq(timeline[1].owner, buyer);
        assertEq(timeline[1].price, ITEM_PRICE);
    }
    
    function testResellItem() public {
        // List and purchase item
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        vm.prank(buyer);
        marketplace.purchaseItem{value: ITEM_PRICE}(1);
        
        // Resell at higher price
        uint256 newPrice = 2 ether;
        vm.prank(buyer);
        marketplace.resellItem(1, newPrice);
        
        (, , uint256 price, address paySeller, , bool isSold, bool isResale, , ) = marketplace.items(1);
        assertEq(price, newPrice);
        assertEq(paySeller, buyer);
        assertFalse(isSold);
        assertTrue(isResale);
    }
    
    function testAddConditionReport() public {
        // List item
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        // Add condition report
        vm.prank(seller);
        marketplace.addConditionReport(1, CONDITION_HASH);
        
        // Check condition hash in timeline
        MarketplaceV2.OwnershipRecord[] memory timeline = marketplace.getOwnershipTimeline(1);
        assertEq(timeline[0].conditionHash, CONDITION_HASH);
    }
    
    function testTransferItem() public {
        // List and purchase item
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        vm.prank(buyer);
        marketplace.purchaseItem{value: ITEM_PRICE}(1);
        
        // Transfer to another address
        vm.prank(buyer);
        marketplace.transferItem(1, buyer2);
        
        // Check new owner
        (, , , , address newOwner, , , , ) = marketplace.items(1);
        assertEq(newOwner, buyer2);
        
        // Check ownership timeline
        MarketplaceV2.OwnershipRecord[] memory timeline = marketplace.getOwnershipTimeline(1);
        assertEq(timeline.length, 3);
        assertEq(timeline[2].owner, buyer2);
        assertEq(timeline[2].price, 0); // Transfer has 0 price
    }
    
    function testGetListedItems() public {
        // List multiple items
        vm.startPrank(seller);
        marketplace.listItem("Item 1", 1 ether, "hash1");
        marketplace.listItem("Item 2", 2 ether, "hash2");
        marketplace.listItem("Item 3", 3 ether, "hash3");
        vm.stopPrank();
        
        // Purchase one item
        vm.prank(buyer);
        marketplace.purchaseItem{value: 1 ether}(1);
        
        // Get listed items (should be 2)
        uint256[] memory listedItems = marketplace.getListedItems();
        assertEq(listedItems.length, 2);
    }
    
    function testCannotBuyOwnItem() public {
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        vm.expectRevert("Cannot buy your own item");
        vm.prank(seller);
        marketplace.purchaseItem{value: ITEM_PRICE}(1);
    }
    
    function testCannotResellUnownedItem() public {
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        vm.expectRevert("You are not the owner");
        vm.prank(buyer);
        marketplace.resellItem(1, 2 ether);
    }
    
    function testCannotAddConditionReportForUnownedItem() public {
        vm.prank(seller);
        marketplace.listItem(ITEM_NAME, ITEM_PRICE, IPFS_HASH);
        
        vm.expectRevert("Only owner can add condition report");
        vm.prank(buyer);
        marketplace.addConditionReport(1, CONDITION_HASH);
    }
}
