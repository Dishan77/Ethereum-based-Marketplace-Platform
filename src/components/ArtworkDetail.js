import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { MARKETPLACE_V2_ABI } from '../contracts/MarketplaceV2';
import ArtistProfile from './ArtistProfile';
import { BACKEND_URL } from '../contracts/MarketplaceV2';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ArtworkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [ownershipHistory, setOwnershipHistory] = useState([]);
  const [similarArtworks, setSimilarArtworks] = useState([]);
  const [showArtistProfile, setShowArtistProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const signer = window.ethereum ? new ethers.BrowserProvider(window.ethereum).getSigner() : null;

  useEffect(() => {
    fetchArtworkDetails();
  }, [id]);

  const fetchArtworkDetails = async () => {
    try {
      setLoading(true);

      // Fetch from database
      const dbResponse = await fetch(`http://localhost:3001/api/artworks/${id}`);
      const dbData = await dbResponse.json();
      setArtwork(dbData);

      // Fetch from blockchain
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, provider);
        
        if (dbData.blockchain_id) {
          const itemDetails = await contract.getItemDetails(dbData.blockchain_id);
          setBlockchainData({
            id: Number(itemDetails[0][0]),
            name: itemDetails[0][1],
            price: ethers.formatEther(itemDetails[0][2]),
            seller: itemDetails[0][3],
            owner: itemDetails[0][4],
            isSold: itemDetails[0][5],
            isResale: itemDetails[0][6],
            ipfsHash: itemDetails[0][7],
            listingTime: Number(itemDetails[0][8]),
            ownershipCount: Number(itemDetails[1]),
            currentOwner: itemDetails[2]
          });

          // Fetch ownership history
          const timeline = await contract.getOwnershipTimeline(dbData.blockchain_id);
          const historyData = timeline.map((record, index) => ({
            owner: record[0],
            timestamp: Number(record[1]),
            price: ethers.formatEther(record[3]),
            index: index
          }));
          setOwnershipHistory(historyData.reverse());
        }
      }

      // Fetch similar artworks
      if (dbData.category) {
        const similarResponse = await fetch(
          `http://localhost:3001/api/artworks?category=${encodeURIComponent(dbData.category)}&limit=4`
        );
        const similarData = await similarResponse.json();
        setSimilarArtworks(similarData.filter(a => a.blockchain_id !== parseInt(id)));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching artwork details:', error);
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!signer || !blockchainData) return;

    try {
      setPurchasing(true);
      const signerInstance = await signer;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signerInstance);
      
      const priceInWei = ethers.parseEther(blockchainData.price);
      const tx = await contract.purchaseItem(blockchainData.id, { value: priceInWei });
      
      await tx.wait();
      alert('Purchase successful!');
      fetchArtworkDetails();
    } catch (error) {
      console.error('Error purchasing artwork:', error);
      alert('Failed to purchase: ' + error.message);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading artwork details...</div>;
  if (!artwork) return <div style={{ padding: '40px', textAlign: 'center' }}>Artwork not found</div>;

  const imageUrls = Array.isArray(artwork.image_urls) 
    ? artwork.image_urls 
    : (artwork.image_urls && typeof artwork.image_urls === 'string' 
        ? JSON.parse(artwork.image_urls) 
        : []);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(-1)}
        style={{ marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
      >
        ← Back to Marketplace
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Left Column: Images */}
        <div>
          <div style={{ 
            width: '100%', 
            height: '500px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '20px',
            position: 'relative'
          }}>
            {imageUrls.length > 0 ? (
              <>
                <img 
                  src={`${BACKEND_URL}${imageUrls[currentImageIndex]}`} 
                  alt={artwork.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {imageUrls.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? imageUrls.length - 1 : prev - 1)}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === imageUrls.length - 1 ? 0 : prev + 1)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}
                    >
                      →
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '64px' }}>🎨</div>
            )}
          </div>
          
          {/* Thumbnails */}
          {imageUrls.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {imageUrls.map((url, idx) => (
                <img 
                  key={idx}
                  src={`${BACKEND_URL}${url}`}
                  alt={`Thumbnail ${idx + 1}`}
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: currentImageIndex === idx ? '2px solid #667eea' : '2px solid transparent'
                  }}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div>
          <h1 style={{ fontSize: '36px', marginBottom: '10px', color: '#2d3748' }}>{artwork.name}</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <span style={{ backgroundColor: '#edf2f7', padding: '6px 12px', borderRadius: '20px', color: '#4a5568', fontSize: '14px' }}>
              {artwork.category}
            </span>
            {blockchainData?.isSold && (
              <span style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                Sold
              </span>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', color: '#718096', marginBottom: '5px' }}>Price</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', margin: 0 }}>
              {blockchainData?.price || artwork.price} ETH
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', color: '#2d3748', marginBottom: '10px' }}>Description</h3>
            <p style={{ color: '#4a5568', lineHeight: '1.6' }}>{artwork.description}</p>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f7fafc', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '18px', color: '#2d3748', marginBottom: '15px' }}>Artist</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 'bold', fontSize: '18px', margin: '0 0 5px 0' }}>
                  {artwork.artist_name || 'Unknown Artist'}
                </p>
                <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
                  {artwork.seller_address}
                </p>
              </div>
              <button 
                onClick={() => setShowArtistProfile(true)}
                style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer', color: '#4a5568' }}
              >
                View Profile
              </button>
            </div>
          </div>

          {!blockchainData?.isSold && (
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: purchasing ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
            >
              {purchasing ? 'Processing...' : 'Purchase Artwork'}
            </button>
          )}
        </div>
      </div>

      {/* Similar Artworks */}
      {similarArtworks.length > 0 && (
        <div style={{ marginTop: '60px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#2d3748' }}>Similar Artworks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {similarArtworks.map(similar => {
               const simImages = Array.isArray(similar.image_urls) 
               ? similar.image_urls 
               : (similar.image_urls && typeof similar.image_urls === 'string' 
                   ? JSON.parse(similar.image_urls) 
                   : []);
              return (
                <div 
                  key={similar.id} 
                  onClick={() => navigate(`/artwork/${similar.blockchain_id}`)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <div style={{ height: '200px', backgroundColor: '#f5f5f5' }}>
                    {simImages[0] && (
                      <img 
                        src={`${BACKEND_URL}${simImages[0]}`} 
                        alt={similar.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ padding: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{similar.name}</h3>
                    <p style={{ color: '#667eea', fontWeight: 'bold', margin: 0 }}>{similar.price} ETH</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showArtistProfile && (
        <ArtistProfile 
          walletAddress={artwork.seller_address} 
          isAdminView={false} 
          onClose={() => setShowArtistProfile(false)} 
        />
      )}
    </div>
  );
};

export default ArtworkDetail;
