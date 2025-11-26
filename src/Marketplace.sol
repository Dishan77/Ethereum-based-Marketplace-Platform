// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {
    struct Item {
        uint id;
        string name;
        uint price;
        address payable seller;
        address owner;
        bool isSold;
    }

    uint public itemCount = 0;
    mapping(uint => Item) public items;
    mapping(address => uint[]) public ownedItems;
    
    // Events for frontend integration
    event ItemListed(uint id, string name, uint price, address seller);
    event ItemSold(uint id, address seller, address buyer, uint price);
    event ItemTransferred(uint id, address from, address to);
    event ItemRemovedFromSale(uint id, address seller);

    function listItem(string memory _name, uint _price) public {
        require(_price > 0, "Price must be greater than zero");
        
        itemCount++;
        items[itemCount] = Item(itemCount, _name, _price, payable(msg.sender), msg.sender, false);
        ownedItems[msg.sender].push(itemCount);
        
        emit ItemListed(itemCount, _name, _price, msg.sender);
    }

    function purchaseItem(uint _id) public payable {
        Item storage item = items[_id];
        require(_id > 0 && _id <= itemCount, "Item does not exist");
        require(msg.value == item.price, "Incorrect price");
        require(!item.isSold, "Item already sold");
        require(msg.sender != item.seller, "Seller cannot buy their own item");
        
        item.isSold = true;
        item.seller.transfer(msg.value);
        
        // Transfer ownership
        _transferOwnership(_id, item.seller, msg.sender);
        
        emit ItemSold(_id, item.seller, msg.sender, item.price);
    }

    function _transferOwnership(uint _id, address _from, address _to) internal {
        Item storage item = items[_id];
        item.owner = _to;
        
        // Remove item from the previous owner's list
        uint[] storage fromItems = ownedItems[_from];
        for (uint i = 0; i < fromItems.length; i++) {
            if (fromItems[i] == _id) {
                fromItems[i] = fromItems[fromItems.length - 1];
                fromItems.pop();
                break;
            }
        }
        
        // Add item to the new owner's list
        ownedItems[_to].push(_id);
        
        emit ItemTransferred(_id, _from, _to);
    }

    function transferItem(uint _id, address _to) public {
        Item storage item = items[_id];
        require(_id > 0 && _id <= itemCount, "Item does not exist");
        require(msg.sender == item.owner, "You do not own this item");
        
        _transferOwnership(_id, msg.sender, _to);
    }
    
    // New function to remove an item from sale
    // function removeFromSale(uint _id) public {
    //     require(_id > 0 && _id <= itemCount, "Item does not exist");
    //     Item storage item = items[_id];
    //     require(item.seller == msg.sender, "Only seller can remove item from sale");
    //     require(!item.isSold, "Item is already sold");
        
    //     // Mark the item as sold to remove it from sale listings
    //     item.isSold = true;
        
    //     emit ItemRemovedFromSale(_id, msg.sender);
    // }

    function getItemsByOwner(address _owner) public view returns (uint[] memory) {
        return ownedItems[_owner];
    }
}
