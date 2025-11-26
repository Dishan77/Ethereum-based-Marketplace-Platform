import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_V2_ABI, CONTRACT_ADDRESS, BACKEND_URL } from '../contracts/MarketplaceV2';

const CustomerDashboard = () => {
  const { user, signer, account } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');

  useEffect(() => {
    fetchArtworks();
    if (account) {
      fetchMyPurchases();
    }
  }, [account]);

  const fetchArtworks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artworks`);
      setArtworks(response.data);
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPurchases = async () => {
    try {
      if (!signer) return;
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const itemIds = await contract.getItemsByOwner(account);
      
      // Fetch details for each item
      const purchases = await Promise.all(
        itemIds.map(async (id) => {
          const [itemData, ownershipCount, originalSeller] = await contract.getItemDetails(id);
          return {
            id: Number(id),
            name: itemData.name,
            price: ethers.formatEther(itemData.price),
            seller: itemData.seller,
            owner: itemData.owner,
            isSold: itemData.isSold,
            isResale: itemData.isResale,
            ipfsHash: itemData.ipfsMetadataHash,
            ownershipCount: Number(ownershipCount),
            originalSeller
          };
        })
      );
      
      setMyPurchases(purchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const purchaseArtwork = async (itemId, price) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const priceInWei = ethers.parseEther(price.toString());
      
      const tx = await contract.purchaseItem(itemId, { value: priceInWei });
      await tx.wait();
      
      alert('Purchase successful!');
      fetchArtworks();
      fetchMyPurchases();
    } catch (error) {
      console.error('Error purchasing artwork:', error);
      alert('Failed to purchase: ' + error.message);
    }
  };

  const viewOwnershipHistory = async (itemId) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const timeline = await contract.getOwnershipTimeline(itemId);
      
      console.log('Ownership Timeline:', timeline);
      alert('Check console for ownership history');
    } catch (error) {
      console.error('Error fetching ownership history:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Customer Dashboard</h1>
      <p>Welcome, {user?.name || account}</p>

      {/* Tabs */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('marketplace')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'marketplace' ? '#007bff' : 'transparent',
            color: activeTab === 'marketplace' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'marketplace' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'purchases' ? '#007bff' : 'transparent',
            color: activeTab === 'purchases' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'purchases' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          My Collection ({myPurchases.length})
        </button>
      </div>

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div>
          <h2>Available Artworks</h2>
          {loading ? (
            <p>Loading...</p>
          ) : artworks.length === 0 ? (
            <p>No artworks available at the moment.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {artworks.map((artwork) => (
                <div
                  key={artwork.blockchainId}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white'
                  }}
                >
                  <h3>{artwork.name}</h3>
                  <p><strong>Price:</strong> {artwork.price} ETH</p>
                  <p><strong>Seller:</strong> {artwork.seller.substring(0, 10)}...</p>
                  <p><strong>Category:</strong> {artwork.category || 'N/A'}</p>
                  {artwork.isResale && (
                    <span style={{ 
                      backgroundColor: '#ffc107', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px' 
                    }}>
                      Resale
                    </span>
                  )}
                  
                  <div style={{ marginTop: '15px' }}>
                    <button
                      onClick={() => purchaseArtwork(artwork.blockchainId, artwork.price)}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Purchases Tab */}
      {activeTab === 'purchases' && (
        <div>
          <h2>My Collection</h2>
          {myPurchases.length === 0 ? (
            <p>You haven't purchased any artworks yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {myPurchases.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white'
                  }}
                >
                  <h3>{item.name}</h3>
                  <p><strong>Purchase Price:</strong> {item.price} ETH</p>
                  <p><strong>Original Seller:</strong> {item.originalSeller.substring(0, 10)}...</p>
                  <p><strong>Ownership Changes:</strong> {item.ownershipCount}</p>
                  
                  <div style={{ marginTop: '15px' }}>
                    <button
                      onClick={() => viewOwnershipHistory(item.id)}
                      style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px'
                      }}
                    >
                      View History
                    </button>
                    <button
                      style={{
                        backgroundColor: '#ffc107',
                        color: 'black',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Resell
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
