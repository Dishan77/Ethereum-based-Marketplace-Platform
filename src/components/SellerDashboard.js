import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_V2_ABI, CONTRACT_ADDRESS, BACKEND_URL } from '../contracts/MarketplaceV2';
import ArtistRegistrationForm from './ArtistRegistrationForm';

const SellerDashboard = () => {
  const { user, signer, account, token, updateProfile } = useAuth();
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingItem, setListingItem] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [artworkImages, setArtworkImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (artworkImages.length + files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    // Add new files to existing images
    setArtworkImages(prev => [...prev, ...files]);

    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setArtworkImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
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

      // Create FormData for image upload
      const formData = new FormData();
      formData.append('blockchainId', Number(itemCount));
      formData.append('sellerAddress', account);
      formData.append('ipfsHash', ipfsHash);
      formData.append('category', category);
      formData.append('name', itemName);
      formData.append('description', itemDescription);
      formData.append('price', itemPrice);
      formData.append('tags', tags);
      
      // Append images
      artworkImages.forEach((image) => {
        formData.append('artworkImages', image);
      });

      // Create artwork entry in database
      await axios.post(
        `${BACKEND_URL}/api/artworks`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('Artwork listed successfully!');
      
      // Reset form
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setCategory('');
      setTags('');
      setArtworkImages([]);
      setImagePreviewUrls([]);
      
      fetchMyItems();
    } catch (error) {
      console.error('Error listing item:', error);
      alert('Failed to list item: ' + error.message);
    } finally {
      setListingItem(false);
    }
  };

  const deleteItem = async (artworkId, blockchainId) => {
    if (!window.confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from database
      await axios.delete(
        `${BACKEND_URL}/api/artworks/${artworkId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Artwork deleted successfully!');
      fetchMyItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
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

  const handleRegistrationSuccess = async (updatedUser) => {
    // Refresh user profile
    await updateProfile(updatedUser);
    setShowRegistrationForm(false);
  };

  // Show registration form if user is not a seller/admin and hasn't registered yet
  console.log('SellerDashboard - User:', user);
  console.log('SellerDashboard - Role:', user?.role);
  console.log('SellerDashboard - artistProfileSubmitted:', user?.artistProfileSubmitted);
  
  if (user?.role !== 'seller' && user?.role !== 'admin') {
    if (!user?.artistProfileSubmitted || showRegistrationForm) {
      return (
        <ArtistRegistrationForm
          account={account}
          token={token}
          onSubmitSuccess={handleRegistrationSuccess}
        />
      );
    }

    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '30px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#856404', marginBottom: '15px' }}>⏳ Application Under Review</h2>
          <p style={{ color: '#856404', fontSize: '16px', lineHeight: '1.6' }}>
            Your artist registration has been submitted and is currently being reviewed by our admin team.
            You will be able to list artworks once your application is approved.
          </p>
          <p style={{ color: '#856404', fontSize: '14px', marginTop: '20px' }}>
            Current status: <strong>{user?.verificationStatus || 'Pending'}</strong>
          </p>
        </div>
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

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Artwork Images (Max 5)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            {imagePreviewUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '15px' }}>
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '25px',
                        height: '25px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: '1'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
              {artworkImages.length}/5 images selected
            </small>
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
                
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {item.qr_code_url && (
                    <button
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      View QR Code
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteItem(item.id, item.blockchain_id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
