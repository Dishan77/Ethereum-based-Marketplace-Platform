import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_V2_ABI, CONTRACT_ADDRESS, BACKEND_URL } from '../contracts/MarketplaceV2';

const SellerDashboard = () => {
  const { user, signer, account } = useAuth();
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingItem, setListingItem] = useState(false);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (account) {
      fetchMyItems();
    }
  }, [account]);

  const fetchMyItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/artworks/seller/${account}`);
      setMyItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const listNewItem = async (e) => {
    e.preventDefault();
    
    if (!signer) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setListingItem(true);

      // Create metadata object
      const metadata = {
        name: itemName,
        description: itemDescription,
        category,
        tags: tags.split(',').map(t => t.trim()),
        listedAt: Date.now()
      };

      // For now, we'll use a simple hash. In production, upload to IPFS
      const ipfsHash = `QmMock${Date.now()}`;

      // List item on blockchain
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const priceInWei = ethers.parseEther(itemPrice);
      
      const tx = await contract.listItem(itemName, priceInWei, ipfsHash);
      await tx.wait();

      // Get the itemId from the event
      const itemCount = await contract.itemCount();

      // Create artwork entry in database
      await axios.post(
        `${BACKEND_URL}/api/artworks`,
        {
          blockchainId: Number(itemCount),
          sellerAddress: account,
          ipfsHash,
          category,
          tags: tags.split(',').map(t => t.trim())
        }
      );

      alert('Item listed successfully!');
      
      // Reset form
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setCategory('');
      setTags('');
      
      fetchMyItems();
    } catch (error) {
      console.error('Error listing item:', error);
      alert('Failed to list item: ' + error.message);
    } finally {
      setListingItem(false);
    }
  };

  const resellItem = async (itemId, newPrice) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signer);
      const priceInWei = ethers.parseEther(newPrice);
      
      const tx = await contract.resellItem(itemId, priceInWei);
      await tx.wait();
      
      alert('Item relisted successfully!');
      fetchMyItems();
    } catch (error) {
      console.error('Error reselling item:', error);
      alert('Failed to resell item: ' + error.message);
    }
  };

  if (user?.role !== 'seller' && user?.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You need seller verification to access this dashboard.</p>
        <p>Your current role: {user?.role}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Seller Dashboard</h1>
      <p>Welcome, {user?.name || account}</p>
      
      {user?.verificationStatus === 'pending' && (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          ⏳ Your seller verification is pending approval
        </div>
      )}

      {user?.verificationStatus === 'verified' && (
        <div style={{ backgroundColor: '#d1e7dd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          ✅ Your seller account is verified
        </div>
      )}

      {/* List New Item Form */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2>List New Artwork</h2>
        <form onSubmit={listNewItem}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Artwork Name *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Price (ETH) *
            </label>
            <input
              type="number"
              step="0.001"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              rows="4"
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select category</option>
              <option value="Painting">Painting</option>
              <option value="Sculpture">Sculpture</option>
              <option value="Pottery">Pottery</option>
              <option value="Textile">Textile</option>
              <option value="Jewelry">Jewelry</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="handmade, traditional, modern"
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <button
            type="submit"
            disabled={listingItem}
            style={{
              backgroundColor: listingItem ? '#6c757d' : '#007bff',
              color: 'white',
              padding: '12px 30px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '4px',
              cursor: listingItem ? 'not-allowed' : 'pointer'
            }}
          >
            {listingItem ? 'Listing...' : 'List Artwork'}
          </button>
        </form>
      </div>

      {/* My Listed Items */}
      <div>
        <h2>My Artworks ({myItems.length})</h2>
        {loading ? (
          <p>Loading...</p>
        ) : myItems.length === 0 ? (
          <p>You haven't listed any artworks yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {myItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: 'white'
                }}
              >
                <h3>{item.name || `Artwork #${item.blockchain_id}`}</h3>
                <p><strong>Category:</strong> {item.category || 'N/A'}</p>
                <p><strong>Views:</strong> {item.views || 0}</p>
                <p><strong>Blockchain ID:</strong> {item.blockchain_id}</p>
                <p><strong>Listed:</strong> {new Date(item.created_at).toLocaleDateString()}</p>
                
                {item.qr_code_url && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px'
                      }}
                    >
                      View QR Code
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
