import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.RPC_URL) {
  throw new Error('RPC_URL is not defined in environment variables');
}

if (!process.env.CONTRACT_ADDRESS) {
  throw new Error('CONTRACT_ADDRESS is not defined in environment variables');
}

// Provider
export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Contract ABI (add full ABI here after compilation)
export const MARKETPLACE_ABI = [
  "event ItemListed(uint256 indexed itemId, address indexed seller, uint256 price, string ipfsHash, uint256 timestamp)",
  "event ItemSold(uint256 indexed itemId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp)",
  "event ItemResold(uint256 indexed itemId, address indexed newSeller, uint256 newPrice, uint256 timestamp)",
  "event ConditionReported(uint256 indexed itemId, address indexed owner, string conditionHash, uint256 timestamp)",
  "event ItemTransferred(uint256 indexed itemId, address indexed from, address indexed to, uint256 timestamp)",
  
  "function listItem(string memory _name, uint256 _price, string memory _ipfsMetadataHash) public",
  "function purchaseItem(uint256 _itemId) public payable",
  "function resellItem(uint256 _itemId, uint256 _newPrice) public",
  "function addConditionReport(uint256 _itemId, string memory _conditionHash) public",
  "function transferItem(uint256 _itemId, address _to) public",
  "function getOwnershipTimeline(uint256 _itemId) public view returns (tuple(address owner, uint256 timestamp, string conditionHash, uint256 price)[] memory)",
  "function getItemsByOwner(address _owner) public view returns (uint256[] memory)",
  "function getItemDetails(uint256 _itemId) public view returns (tuple(uint256 id, string name, uint256 price, address seller, address owner, bool isSold, bool isResale, string ipfsMetadataHash, uint256 listedAt), uint256 ownershipCount, address originalSeller)",
  "function getListedItems() public view returns (uint256[] memory)",
  "function itemCount() public view returns (uint256)",
  "function items(uint256) public view returns (uint256 id, string name, uint256 price, address seller, address owner, bool isSold, bool isResale, string ipfsMetadataHash, uint256 listedAt)"
];

// Contract instance
export const marketplaceContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  MARKETPLACE_ABI,
  provider
);

console.log('✓ Blockchain provider initialized');
console.log(`Contract address: ${process.env.CONTRACT_ADDRESS}`);
