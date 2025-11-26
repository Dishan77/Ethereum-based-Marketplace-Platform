import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  // Deployed locally with Foundry (anvil)
  const ENV_CONTRACT = process.env.REACT_APP_CONTRACT_ADDRESS;
  const ENV_RPC = process.env.REACT_APP_RPC_URL;
  const DEFAULT_CONTRACT = "0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519";
  const CONTRACT_ADDRESS = ENV_CONTRACT || DEFAULT_CONTRACT;
  const LOCAL_CHAIN_ID = 31337;
  const LOCAL_CHAIN_HEX = "0x7a69"; // 31337 in hex
  const LOCAL_RPC = ENV_RPC || "http://127.0.0.1:8545";
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
  // Controlled inputs for better UX
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [transferInputs, setTransferInputs] = useState({});

  // Initialize the application and load data
  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        // Ensure MetaMask is connected to the local Anvil network (chainId 31337)
        try {
          const network = await provider.getNetwork();
          if (network.chainId !== LOCAL_CHAIN_ID) {
            try {
              await provider.send("wallet_switchEthereumChain", [
                { chainId: LOCAL_CHAIN_HEX },
              ]);
            } catch (switchError) {
              // 4902: chain not added to MetaMask
              if (switchError && switchError.code === 4902) {
                try {
                  await provider.send("wallet_addEthereumChain", [
                    {
                      chainId: LOCAL_CHAIN_HEX,
                      chainName: "Anvil Local",
                      rpcUrls: [LOCAL_RPC],
                      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                    },
                  ]);
                } catch (addError) {
                  console.error("Failed to add local chain to MetaMask:", addError);
                }
              } else {
                console.error("Failed to switch MetaMask to local chain:", switchError);
              }
            }
          }
        } catch (err) {
          console.error("Error checking/switching network:", err);
        }
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

        // Reload data when chain changes
        window.ethereum.on("chainChanged", async (chainIdHex) => {
          // chainIdHex is hex string like '0x1' or '0x7a69'
          try {
            const accounts = await provider.send("eth_requestAccounts", []);
            setAccount(accounts[0]);
            const signer = provider.getSigner();
            setSigner(signer);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            setContract(contract);
            await loadAllData(contract, accounts[0]);
          } catch (e) {
            console.error("Error handling chainChanged:", e);
          }
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
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-200 to-brown-300 p-8 font-sans relative">
      {/* Header */}
      <header className="w-full py-6 bg-white bg-opacity-95 backdrop-blur-md shadow-lg rounded-2xl mb-8 fade-in-up">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
                                                <img src="logo.png" alt="Logo" className="h-16 w-16 rounded-lg" />
            <div>
              <div className="text-2xl font-extrabold text-gray-900">KALA</div>
              <div className="text-sm text-gray-600">Empowering artisans worldwide</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center bg-gray-100 shadow-md rounded-full p-2 pr-4 card-hover">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold mr-2">
                  {account.substring(2, 4).toUpperCase()}
                </div>
                <span className="text-gray-700 font-medium">{formatAddress(account)}</span>
              </div>
            ) : (
              <button
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                onClick={async () => {
                  if (provider) {
                    try {
                      const accounts = await provider.send("eth_requestAccounts", []);
                      setAccount(accounts[0]);
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center mb-6 fade-in-up">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-2 text-gray-800">Processing transaction...</p>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto my-12 px-4 fade-in-up">
        <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-3xl shadow-2xl p-8 grid md:grid-cols-2 gap-8 items-center card-hover">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Empower Artisans, Showcase Craftsmanship
            </h2>
            <p className="text-gray-600 mb-6">Join a global marketplace designed to celebrate and support artisans. List your handcrafted items and connect with buyers worldwide.</p>

            <div className="bg-white rounded-xl p-4 shadow-inner">
              <img src="list_your_art.png" alt="List Your Art" className="w-full h-32 object-cover rounded-lg mb-4" />
              <label className="block text-sm font-medium text-gray-700">Item Name</label>
              <input value={newItemName} onChange={e => setNewItemName(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all duration-300" placeholder="Handmade Mug" />
              <label className="block text-sm font-medium text-gray-700 mt-3">Price (ETH)</label>
              <input value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all duration-300" placeholder="0.05" />
              <div className="mt-4 flex gap-3">
                <button onClick={() => listItem(newItemName, newItemPrice)} disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-300">List Item</button>
                <button onClick={() => { setNewItemName(''); setNewItemPrice(''); }} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-300">Clear</button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <img src="logo.png" alt="Artisan Showcase" className="mx-auto w-96 h-96 rounded-lg object-cover " />
            <p className="text-sm text-gray-500 mt-4">Showcase your unique creations to a global audience.</p>
          </div>
        </div>
      </section>

      {/* Items for Sale */}
      <section className="max-w-6xl mx-auto my-12 px-4 fade-in-up">
        <h2 className="text-3xl font-extrabold mb-6 text-gray-900 text-center">Available Items</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length > 0 ? items.map((item, index) => (
            <div key={item.id} className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-lg p-5 flex flex-col justify-between card-hover" style={{ animationDelay: `${index * 0.1}s` }}>
              <div>
                <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500 mt-1">Seller: {formatAddress(item.seller)}</div>
                <div className="text-amber-600 font-bold text-xl mt-3">{ethers.utils.formatEther(item.price)} ETH</div>
              </div>
              <div className="mt-4">
                <button onClick={() => purchaseItem(item.id, item.price)} disabled={loading} className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold py-2 rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-300">Buy Now</button>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center text-white">No items available for sale</div>
          )}
        </div>
      </section>

      {/* Owned Items */}
      <section className="max-w-6xl mx-auto my-12 px-4 fade-in-up">
        <h2 className="text-3xl font-extrabold mb-6 text-gray-900 text-center">Your Items</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ownedItems.length > 0 ? ownedItems.map((item, index) => (
            <div key={item.id} className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-lg p-5 flex flex-col card-hover" style={{ animationDelay: `${index * 0.1}s` }}>
              <div>
                <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500 mt-1">Price: {ethers.utils.formatEther(item.price)} ETH</div>
                <div className={`mt-2 ${item.isSold ? 'text-gray-500' : 'text-green-600'}`}>{item.isSold ? 'Not For Sale' : 'For Sale'}</div>
              </div>
              <div className="mt-4">
                <input value={transferInputs[item.id] || ''} onChange={(e) => setTransferInputs({...transferInputs, [item.id]: e.target.value})} placeholder="Recipient address" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all duration-300" />
                <button onClick={() => transferItem(item.id, transferInputs[item.id])} disabled={loading} className="w-full mt-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-300">Transfer</button>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center text-white">You don't own any items yet</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;