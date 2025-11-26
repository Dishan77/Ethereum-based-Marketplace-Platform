// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MarketplaceV2 {
    
    struct Item {
        uint256 id;
        string name;
        uint256 price;
        address payable seller;
        address owner;
        bool isSold;
        bool isResale;
        string ipfsMetadataHash;
        uint256 listedAt;
    }
    
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        string conditionHash;  // IPFS hash of condition report
        uint256 price;
    }
    
    // State variables
    uint256 public itemCount;
    mapping(uint256 => Item) public items;
    mapping(address => uint256[]) public ownedItems;
    mapping(uint256 => OwnershipRecord[]) public ownershipTimeline;
    
    // Events
    event ItemListed(
        uint256 indexed itemId, 
        address indexed seller, 
        uint256 price, 
        string ipfsHash,
        uint256 timestamp
    );
    
    event ItemSold(
        uint256 indexed itemId, 
        address indexed buyer, 
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    
    event ItemResold(
        uint256 indexed itemId, 
        address indexed newSeller, 
        uint256 newPrice,
        uint256 timestamp
    );
    
    event ConditionReported(
        uint256 indexed itemId, 
        address indexed owner,
        string conditionHash,
        uint256 timestamp
    );
    
    event ItemTransferred(
        uint256 indexed itemId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    // List new artwork
    function listItem(
        string memory _name, 
        uint256 _price,
        string memory _ipfsMetadataHash
    ) public {
        require(_price > 0, "Price must be greater than zero");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_ipfsMetadataHash).length > 0, "IPFS hash cannot be empty");
        
        itemCount++;
        
        items[itemCount] = Item({
            id: itemCount,
            name: _name,
            price: _price,
            seller: payable(msg.sender),
            owner: msg.sender,
            isSold: false,
            isResale: false,
            ipfsMetadataHash: _ipfsMetadataHash,
            listedAt: block.timestamp
        });
        
        ownedItems[msg.sender].push(itemCount);
        
        // Initialize ownership timeline
        ownershipTimeline[itemCount].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            conditionHash: "",
            price: _price
        }));
        
        emit ItemListed(itemCount, msg.sender, _price, _ipfsMetadataHash, block.timestamp);
    }
    
    // Purchase item
    function purchaseItem(uint256 _itemId) public payable {
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(!item.isSold, "Item already sold");
        require(msg.value == item.price, "Incorrect price");
        require(msg.sender != item.owner, "Cannot buy your own item");
        
        address previousOwner = item.owner;
        address payable seller = item.seller;
        
        // Transfer funds to seller
        seller.transfer(msg.value);
        
        // Update ownership
        item.owner = msg.sender;
        item.isSold = true;
        
        // Update owned items
        _removeFromOwnedItems(previousOwner, _itemId);
        ownedItems[msg.sender].push(_itemId);
        
        // Add to ownership timeline
        ownershipTimeline[_itemId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            conditionHash: "",
            price: item.price
        }));
        
        emit ItemSold(_itemId, msg.sender, seller, item.price, block.timestamp);
    }
    
    // Resell item (owner can list their purchased item again)
    function resellItem(uint256 _itemId, uint256 _newPrice) public {
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(item.owner == msg.sender, "You are not the owner");
        require(_newPrice > 0, "Price must be greater than zero");
        require(item.isSold, "Item must be purchased before reselling");
        
        item.price = _newPrice;
        item.seller = payable(msg.sender);
        item.isSold = false;
        item.isResale = true;
        
        emit ItemResold(_itemId, msg.sender, _newPrice, block.timestamp);
    }
    
    // Add or update condition report
    function addConditionReport(uint256 _itemId, string memory _conditionHash) public {
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(item.owner == msg.sender, "Only owner can add condition report");
        require(bytes(_conditionHash).length > 0, "Condition hash cannot be empty");
        
        // Update the latest ownership record with condition hash
        uint256 timelineLength = ownershipTimeline[_itemId].length;
        require(timelineLength > 0, "No ownership record found");
        
        ownershipTimeline[_itemId][timelineLength - 1].conditionHash = _conditionHash;
        
        emit ConditionReported(_itemId, msg.sender, _conditionHash, block.timestamp);
    }
    
    // Transfer item to another address (gift/inheritance)
    function transferItem(uint256 _itemId, address _newOwner) public {
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        require(item.owner == msg.sender, "You are not the owner");
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");
        
        address previousOwner = item.owner;
        
        // Update ownership
        item.owner = _newOwner;
        
        // Update owned items
        _removeFromOwnedItems(previousOwner, _itemId);
        ownedItems[_newOwner].push(_itemId);
        
        // Add to ownership timeline (price = 0 for transfers)
        ownershipTimeline[_itemId].push(OwnershipRecord({
            owner: _newOwner,
            timestamp: block.timestamp,
            conditionHash: "",
            price: 0
        }));
        
        emit ItemTransferred(_itemId, msg.sender, _newOwner, block.timestamp);
    }
    
    // Get ownership timeline for an item
    function getOwnershipTimeline(uint256 _itemId) public view returns (OwnershipRecord[] memory) {
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        return ownershipTimeline[_itemId];
    }
    
    // Get all items owned by an address
    function getItemsByOwner(address _owner) public view returns (uint256[] memory) {
        return ownedItems[_owner];
    }
    
    // Get item details with ownership info
    function getItemDetails(uint256 _itemId) public view returns (
        Item memory item,
        uint256 ownershipCount,
        address originalSeller
    ) {
        require(_itemId > 0 && _itemId <= itemCount, "Item does not exist");
        
        item = items[_itemId];
        ownershipCount = ownershipTimeline[_itemId].length;
        originalSeller = ownershipTimeline[_itemId][0].owner;
        
        return (item, ownershipCount, originalSeller);
    }
    
    // Get all listed items (not sold)
    function getListedItems() public view returns (uint256[] memory) {
        uint256 listedCount = 0;
        
        // Count listed items
        for (uint256 i = 1; i <= itemCount; i++) {
            if (!items[i].isSold) {
                listedCount++;
            }
        }
        
        // Create array of listed item IDs
        uint256[] memory listedItemIds = new uint256[](listedCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= itemCount; i++) {
            if (!items[i].isSold) {
                listedItemIds[index] = i;
                index++;
            }
        }
        
        return listedItemIds;
    }
    
    // Internal function to remove item from owned items array
    function _removeFromOwnedItems(address _owner, uint256 _itemId) private {
        uint256[] storage itemsArray = ownedItems[_owner];
        
        for (uint256 i = 0; i < itemsArray.length; i++) {
            if (itemsArray[i] == _itemId) {
                // Move last element to this position and pop
                itemsArray[i] = itemsArray[itemsArray.length - 1];
                itemsArray.pop();
                break;
            }
        }
    }
}
