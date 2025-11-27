import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_V2_ABI, CONTRACT_ADDRESS, BACKEND_URL } from '../contracts/MarketplaceV2';

const CustomerDashboard = () => {
  const { user, signer, account } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [filteredArtworks, setFilteredArtworks] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchArtworks();
    if (account) {
      fetchMyPurchases();
    }
  }, [account]);

  const fetchArtworks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artworks`);
      
      // Fetch current prices from blockchain (in case of resale price changes)
      if (signer) {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
        
        const artworksWithBlockchainPrices = await Promise.all(
          response.data.map(async (artwork) => {
            try {
              const item = await contract.items(artwork.blockchain_id);
              return {
                ...artwork,
                priceWei: item.price.toString(), // Current price from blockchain
                price: ethers.formatEther(item.price), // Display price in ETH
                isSold: item.isSold,
                isResale: item.isResale,
                seller: item.seller
              };
            } catch (error) {
              console.error(`Error fetching item ${artwork.blockchain_id}:`, error);
              // Fallback to database price (already in ETH)
              return {
                ...artwork,
                price: artwork.price || '0' // Price from DB is already in ETH format
              };
            }
          })
        );
        
        // Filter out sold items
        const availableArtworks = artworksWithBlockchainPrices.filter(a => !a.isSold);
        setArtworks(availableArtworks);
        setFilteredArtworks(availableArtworks);
      } else {
        // Fallback if no signer - price from DB is already in ETH
        const artworksWithPrices = response.data.map(artwork => ({
          ...artwork,
          price: artwork.price || '0' // Price from DB is already in ETH format
        }));
        setArtworks(artworksWithPrices);
        setFilteredArtworks(artworksWithPrices);
      }
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

  // Search and filter logic
  useEffect(() => {
    let filtered = [...artworks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(artwork => {
        const matchesName = artwork.name?.toLowerCase().includes(query);
        const matchesDescription = artwork.description?.toLowerCase().includes(query);
        const matchesCategory = artwork.category?.toLowerCase().includes(query);
        const matchesTags = artwork.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesSeller = artwork.seller_address?.toLowerCase().includes(query);
        
        return matchesName || matchesDescription || matchesCategory || matchesTags || matchesSeller;
      });
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(artwork => artwork.category === selectedCategory);
    }

    setFilteredArtworks(filtered);
  }, [searchQuery, selectedCategory, artworks]);

  const purchaseArtwork = async (itemId, priceWei) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      
      // Check balance first
      const balance = await signer.provider.getBalance(account);
      
      if (balance < priceWei) {
        alert(`Insufficient funds! You need ${ethers.formatEther(priceWei)} ETH but only have ${ethers.formatEther(balance)} ETH`);
        return;
      }
      
      // priceWei is already in Wei, no need to convert
      const tx = await contract.purchaseItem(itemId, { value: priceWei });
      await tx.wait();
      
      alert('Purchase successful!');
      fetchArtworks();
      fetchMyPurchases();
    } catch (error) {
      console.error('Error purchasing artwork:', error);
      
      // Better error messages
      if (error.reason) {
        alert('Failed to purchase: ' + error.reason);
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        alert('Insufficient funds in your wallet!');
      } else {
        alert('Failed to purchase: ' + error.message);
      }
    }
  };

  const viewOwnershipHistory = async (itemId, itemName) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const timeline = await contract.getOwnershipTimeline(itemId);
      
      // Reverse the timeline so current owner is first
      const formattedHistory = [...timeline].reverse().map((record, index) => ({
        owner: record.owner,
        timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
        price: record.price > 0 ? ethers.formatEther(record.price) + ' ETH' : 'Transfer (No payment)',
        conditionHash: record.conditionHash || 'N/A'
      }));
      
      setSelectedHistory({ itemId, itemName, timeline: formattedHistory });
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching ownership history:', error);
      alert('Failed to fetch ownership history');
    }
  };

  const closeHistoryModal = () => {
    setShowHistory(false);
    setSelectedHistory(null);
  };

  const resellItem = async (itemId) => {
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    const newPrice = prompt('Enter new price in ETH:');
    if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const priceInWei = ethers.parseEther(newPrice);
      
      const tx = await contract.resellItem(itemId, priceInWei);
      await tx.wait();
      
      alert('Item relisted successfully!');
      fetchArtworks();
      fetchMyPurchases();
    } catch (error) {
      console.error('Error reselling item:', error);
      alert('Failed to resell: ' + error.message);
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
          <h2>Marketplace</h2>
          
          {/* Search and Filter Section */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search Bar */}
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search artworks, tags, categories, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ flex: '0 1 200px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid #ccc'
                }}
              >
                <option value="all">All Categories</option>
                <option value="Painting">Painting</option>
                <option value="Sculpture">Sculpture</option>
                <option value="Pottery">Pottery</option>
                <option value="Textile">Textile</option>
                <option value="Jewelry">Jewelry</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Results Count */}
            <div style={{ flex: '0 1 auto', color: '#666' }}>
              {filteredArtworks.length} {filteredArtworks.length === 1 ? 'artwork' : 'artworks'} found
            </div>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : filteredArtworks.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              {searchQuery || selectedCategory !== 'all' 
                ? 'No artworks match your search criteria.' 
                : 'No artworks available at the moment.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredArtworks.map((artwork) => {
                // image_urls is already a JSON array from PostgreSQL JSONB
                const imageUrls = Array.isArray(artwork.image_urls) 
                  ? artwork.image_urls 
                  : (artwork.image_urls && typeof artwork.image_urls === 'string' 
                      ? JSON.parse(artwork.image_urls) 
                      : []);
                const firstImage = imageUrls[0];
                
                return (
                  <div
                    key={artwork.blockchain_id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Artwork Image */}
                    {firstImage && (
                      <div style={{ 
                        width: '100%', 
                        height: '240px', 
                        backgroundColor: '#f5f5f5',
                        position: 'relative'
                      }}>
                        <img
                          src={`${BACKEND_URL}${firstImage}`}
                          alt={artwork.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:48px;">🎨</div>';
                          }}
                        />
                        {artwork.isResale && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            RESALE
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ padding: '16px' }}>
                      {/* Title */}
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '20px',
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {artwork.name || `Artwork #${artwork.blockchain_id}`}
                      </h3>

                      {/* Artist */}
                      <p style={{ 
                        margin: '0 0 8px 0', 
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        <strong>Artist:</strong> {artwork.seller_address?.substring(0, 8)}...{artwork.seller_address?.substring(38)}
                      </p>

                      {/* Description */}
                      {artwork.description && (
                        <p style={{ 
                          margin: '0 0 12px 0', 
                          color: '#666',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          maxHeight: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {artwork.description}
                        </p>
                      )}

                      {/* Category */}
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ 
                          backgroundColor: '#e3f2fd', 
                          color: '#1976d2',
                          padding: '4px 10px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {artwork.category || 'Uncategorized'}
                        </span>
                      </div>

                      {/* Tags */}
                      {artwork.tags && artwork.tags.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px',
                          marginBottom: '12px'
                        }}>
                          {artwork.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                                padding: '3px 8px',
                                borderRadius: '3px',
                                fontSize: '11px'
                              }}
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #eee'
                      }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                          {artwork.price} ETH
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => purchaseArtwork(artwork.blockchain_id, artwork.priceWei)}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '12px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            flex: 1,
                            fontSize: '16px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                        >
                          Buy Now
                        </button>
                        
                        <button
                          onClick={() => viewOwnershipHistory(artwork.blockchain_id)}
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '12px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                        >
                          History
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      onClick={() => viewOwnershipHistory(item.id, item.name)}
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
                    {item.isSold && (
                      <button
                        onClick={() => resellItem(item.id)}
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
                    )}
                    {!item.isSold && item.ownershipCount === 1 && (
                      <span style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        (Not yet sold)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ownership History Modal */}
      {showHistory && selectedHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={closeHistoryModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>Ownership History</h2>
              <button
                onClick={closeHistoryModal}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>
            
            <h3 style={{ color: '#555', marginBottom: '20px' }}>{selectedHistory.itemName}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedHistory.timeline.map((record, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: index === 0 ? '#f0f9ff' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        backgroundColor: index === 0 ? '#3b82f6' : '#6b7280',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginRight: '10px'
                      }}
                    >
                      {index === 0 ? 'CURRENT OWNER' : `Owner #${selectedHistory.timeline.length - index}`}
                    </span>
                    <span style={{ fontSize: '14px', color: '#666' }}>{record.timestamp}</span>
                  </div>
                  
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Address:</strong>{' '}
                      <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                        {record.owner}
                      </code>
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Price:</strong> {record.price}
                    </p>
                    {record.conditionHash !== 'N/A' && (
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>Condition Hash:</strong>{' '}
                        <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                          {record.conditionHash}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
