export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "addConditionReport",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" },
      { "name": "_conditionHash", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getItemDetails",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "item",
        "type": "tuple",
        "internalType": "struct MarketplaceV2.Item",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "name", "type": "string", "internalType": "string" },
          { "name": "price", "type": "uint256", "internalType": "uint256" },
          { "name": "seller", "type": "address", "internalType": "address payable" },
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "isSold", "type": "bool", "internalType": "bool" },
          { "name": "isResale", "type": "bool", "internalType": "bool" },
          { "name": "ipfsMetadataHash", "type": "string", "internalType": "string" },
          { "name": "listedAt", "type": "uint256", "internalType": "uint256" }
        ]
      },
      { "name": "ownershipCount", "type": "uint256", "internalType": "uint256" },
      { "name": "originalSeller", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getItemsByOwner",
    "inputs": [
      { "name": "_owner", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256[]", "internalType": "uint256[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getListedItems",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256[]", "internalType": "uint256[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOwnershipTimeline",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct MarketplaceV2.OwnershipRecord[]",
        "components": [
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "timestamp", "type": "uint256", "internalType": "uint256" },
          { "name": "conditionHash", "type": "string", "internalType": "string" },
          { "name": "price", "type": "uint256", "internalType": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "itemCount",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "items",
    "inputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "seller", "type": "address", "internalType": "address payable" },
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "isSold", "type": "bool", "internalType": "bool" },
      { "name": "isResale", "type": "bool", "internalType": "bool" },
      { "name": "ipfsMetadataHash", "type": "string", "internalType": "string" },
      { "name": "listedAt", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "listItem",
    "inputs": [
      { "name": "_name", "type": "string", "internalType": "string" },
      { "name": "_price", "type": "uint256", "internalType": "uint256" },
      { "name": "_ipfsMetadataHash", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ownedItems",
    "inputs": [
      { "name": "", "type": "address", "internalType": "address" },
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ownershipTimeline",
    "inputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" },
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "timestamp", "type": "uint256", "internalType": "uint256" },
      { "name": "conditionHash", "type": "string", "internalType": "string" },
      { "name": "price", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "purchaseItem",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "resellItem",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" },
      { "name": "_newPrice", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferItem",
    "inputs": [
      { "name": "_itemId", "type": "uint256", "internalType": "uint256" },
      { "name": "_newOwner", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ConditionReported",
    "inputs": [
      { "name": "itemId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "conditionHash", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemListed",
    "inputs": [
      { "name": "itemId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "ipfsHash", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemResold",
    "inputs": [
      { "name": "itemId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "newSeller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "newPrice", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemSold",
    "inputs": [
      { "name": "itemId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemTransferred",
    "inputs": [
      { "name": "itemId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "from", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "to", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
];

export const MARKETPLACE_V2_ABI = CONTRACT_ABI;
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
export const LOCAL_CHAIN_ID = 31337;

export default {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  MARKETPLACE_V2_ABI,
  BACKEND_URL,
  LOCAL_CHAIN_ID,
};
