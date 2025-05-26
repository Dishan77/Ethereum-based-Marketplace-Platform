import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const CONTRACT_ADDRESS = "0x788ff72228dafb0eca5c8c6d8e2d3de1d7324c43";
  const ABI = [
    {
      inputs: [
        {
          internalType: "address",
          name: "_owner",
          type: "address",
        },
      ],
      name: "getItemsByOwner",
      outputs: [
        {
          internalType: "uint256[]",
          name: "",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "itemCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "items",
      outputs: [
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "name",
          type: "string",
        },
        {
          internalType: "uint256",
          name: "price",
          type: "uint256",
        },
        {
          internalType: "address payable",
          name: "seller",
          type: "address",
        },
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "bool",
          name: "isSold",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "_name",
          type: "string",
        },
        {
          internalType: "uint256",
          name: "_price",
          type: "uint256",
        },
      ],
      name: "listItem",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "ownedItems",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_id",
          type: "uint256",
        },
      ],
      name: "purchaseItem",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_id",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "_to",
          type: "address",
        },
      ],
      name: "transferItem",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_id",
          type: "uint256",
        },
      ],
      name: "removeFromSale",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  // Items available for purchase (not sold and not owned by current user)
  const [items, setItems] = useState([]);
  // Items owned by the current user
  const [ownedItems, setOwnedItems] = useState([]);
  // Items listed by the current user
  const [listedItems, setListedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialize the application and load data
  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);

        // Listen for account changes in MetaMask
        window.ethereum.on("accountsChanged", async (accounts) => {
          setAccount(accounts[0]);
          const signer = provider.getSigner();
          setSigner(signer);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
          setContract(contract);

          await loadAllData(contract, accounts[0]);
        });

        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);

        const signer = provider.getSigner();
        setSigner(signer);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        setContract(contract);

        await loadAllData(contract, accounts[0]);
      }
    };
    init();
  }, []);

  const loadAllData = async (contract, currentAccount) => {
    setLoading(true);
    try {
      await Promise.all([
        loadItems(contract, currentAccount),
        loadOwnedItems(contract, currentAccount),
        loadListedItems(contract, currentAccount),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modified loadItems function to filter out sold items AND items owned by the current user
  const loadItems = async (contract, currentAccount) => {
    const itemCount = await contract.itemCount();
    let availableItems = [];
    for (let i = 1; i <= itemCount; i++) {
      const item = await contract.items(i);
      // Only add items that are not sold AND not owned by the current user
      if (
        !item.isSold &&
        item.seller.toLowerCase() !== currentAccount.toLowerCase()
      ) {
        availableItems.push({
          ...item,
          id: item.id.toNumber(),
          price: item.price,
        });
      }
    }
    setItems(availableItems);
  };

  const loadOwnedItems = async (contract, owner) => {
    try {
      const ownedItemIds = await contract.getItemsByOwner(owner);
      let ownedItemsArray = [];
      for (let i = 0; i < ownedItemIds.length; i++) {
        const item = await contract.items(ownedItemIds[i]);
        ownedItemsArray.push({
          ...item,
          id: item.id.toNumber(),
          price: item.price,
        });
      }
      setOwnedItems(ownedItemsArray);
    } catch (error) {
      console.error("Error loading owned items:", error);
      setOwnedItems([]);
    }
  };

  const loadListedItems = async (contract, currentAccount) => {
    const itemCount = await contract.itemCount();
    let userListedItems = [];
    for (let i = 1; i <= itemCount; i++) {
      const item = await contract.items(i);
      // Only add items that are listed by the current user and not sold
      if (
        !item.isSold &&
        item.seller.toLowerCase() === currentAccount.toLowerCase()
      ) {
        userListedItems.push({
          ...item,
          id: item.id.toNumber(),
          price: item.price,
        });
      }
    }
    setListedItems(userListedItems);
  };

  const listItem = async (name, price) => {
    if (!name || !price) {
      alert("Please provide both item name and price");
      return;
    }

    setLoading(true);
    try {
      // Convert price from ETH to wei
      const priceInWei = ethers.utils.parseEther(price);
      const tx = await contract.listItem(name, priceInWei);
      await tx.wait();

      // Clear input fields after successful listing
      document.getElementById("itemName").value = "";
      document.getElementById("itemPrice").value = "";

      await loadAllData(contract, account);
    } catch (error) {
      console.error("Error listing item:", error);
      alert("Failed to list item. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (id, price) => {
    setLoading(true);
    try {
      // Send the exact price in wei as required by the smart contract
      const tx = await contract.purchaseItem(id, {
        value: price,
      });
      await tx.wait();
      await loadAllData(contract, account);
    } catch (error) {
      console.error("Error purchasing item:", error);
      alert("Failed to purchase item. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const transferItem = async (id, toAddress) => {
    if (!ethers.utils.isAddress(toAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.transferItem(id, toAddress);
      await tx.wait();
      await loadAllData(contract, account);
    } catch (error) {
      console.error("Error transferring item:", error);
      alert("Failed to transfer item. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const removeFromSale = async (id) => {
    setLoading(true);
    try {
      const tx = await contract.removeFromSale(id);
      await tx.wait();
      await loadAllData(contract, account);
    } catch (error) {
      console.error("Error removing item from sale:", error);
      alert("Failed to remove item from sale. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format address
  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-8 font-sans relative">
      {/* Account logo in top right */}
      {account && (
        <div className="absolute top-4 right-4 flex items-center bg-white shadow-md rounded-full p-2 pr-4 hover:shadow-lg transition-all duration-300">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-2 overflow-hidden">
            <img
              src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FF41B4"/><stop offset="100%" stop-color="%236B46EF"/></linearGradient></defs><rect width="40" height="40" fill="url(%23a)"/><text x="50%" y="50%" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" dy=".3em" fill="white">${account
                .substring(2, 4)
                .toUpperCase()}</text></svg>`}
              alt="Account"
              className="h-full w-full"
            />
          </div>
          <span className="text-gray-700 font-medium">
            {formatAddress(account)}
          </span>
        </div>
      )}

      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 drop-shadow-md">
        🛒 Blockchain Marketplace
      </h1>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center mb-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Processing transaction...</p>
        </div>
      )}

      {/* List Item Section */}
      <div className="bg-white shadow-lg rounded-2xl p-6 mb-12 max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          List New Item
        </h2>
        <div className="flex flex-col gap-4">
          <input
            id="itemName"
            placeholder="Item Name"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            id="itemPrice"
            placeholder="Item Price (in ETH)"
            type="number"
            step="0.01"
            min="0"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 rounded-lg transition duration-300 disabled:opacity-50"
            onClick={() =>
              listItem(
                document.getElementById("itemName").value,
                document.getElementById("itemPrice").value
              )
            }
            disabled={loading}
          >
            🚀 List Item
          </button>
        </div>
      </div>

      {/* Your Listed Items Section */}
      {/* <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-center text-gray-700">
          Your Listed Items
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listedItems.length > 0 ? (
            listedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white shadow-md rounded-xl p-5 space-y-3"
              >
                <p>
                  <strong>Name:</strong> {item.name}
                </p>
                <p>
                  <strong>Price:</strong> {ethers.utils.formatEther(item.price)}{" "}
                  ETH
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="text-green-500">For Sale</span>
                </p>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold w-full py-2 rounded-lg transition disabled:opacity-50"
                  onClick={() => removeFromSale(item.id)}
                  disabled={loading}
                >
                  Remove from Sale
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-full">
              You haven't listed any items for sale
            </p>
          )}
        </div>
      </div> */}

      {/* Items for Sale */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-center text-gray-700">
          Items for Sale
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white shadow-md rounded-xl p-5 space-y-3"
              >
                <p>
                  <strong>Name:</strong> {item.name}
                </p>
                <p>
                  <strong>Price:</strong> {ethers.utils.formatEther(item.price)}{" "}
                  ETH
                </p>
                <p>
                  <strong>Seller:</strong> {formatAddress(item.seller)}
                </p>
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold w-full py-2 rounded-lg transition disabled:opacity-50"
                  onClick={() => purchaseItem(item.id, item.price)}
                  disabled={loading}
                >
                  Buy Now
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-full">
              No items currently available for sale
            </p>
          )}
        </div>
      </div>

      {/* Owned Items */}
      <div>
        <h2 className="text-3xl font-semibold mb-6 text-center text-gray-700">
          Your Items
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ownedItems.length > 0 ? (
            ownedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white shadow-md rounded-xl p-5 space-y-3"
              >
                <p>
                  <strong>Name:</strong> {item.name}
                </p>
                <p>
                  <strong>Price:</strong> {ethers.utils.formatEther(item.price)}{" "}
                  ETH
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={item.isSold ? "text-gray-500" : "text-green-500"}>
                    {item.isSold ? "Not For Sale" : "For Sale"}
                  </span>
                </p>
                <input
                  id={`transferAddress${item.id}`}
                  placeholder="Transfer to Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold w-full py-2 rounded-lg transition disabled:opacity-50"
                  onClick={() =>
                    transferItem(
                      item.id,
                      document.getElementById(`transferAddress${item.id}`).value
                    )
                  }
                  disabled={loading}
                >
                  Transfer
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-full">
              You don't own any items yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;