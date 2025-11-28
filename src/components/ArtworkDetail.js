import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { MARKETPLACE_V2_ABI } from '../contracts/MarketplaceV2';
import ArtistProfile from './ArtistProfile';

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
            price: ethers.formatEther(record[2]),
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
        setSimilarArtworks(similarData.filter(a => a.id !== parseInt(id)));
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

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading artwork details...</p>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div style={styles.container}>
        <p>Artwork not found</p>
        <button onClick={() => navigate(-1)} style={styles.backButton}>Go Back</button>
      </div>
    );
  }

  const currentUserAddress = window.ethereum?.selectedAddress?.toLowerCase();
  const isOwner = blockchainData && currentUserAddress === blockchainData.currentOwner.toLowerCase();

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>← Back</button>

      <div style={styles.contentGrid}>
        {/* Left Column - Images */}
        <div style={styles.imageSection}>
          <img 
            src={artwork.ipfs_hash} 
            alt={artwork.name}
            style={styles.mainImage}
          />
          {artwork.additional_images && artwork.additional_images.length > 0 && (
            <div style={styles.additionalImages}>
              {artwork.additional_images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`${artwork.name} - view ${index + 1}`}
                  style={styles.thumbnail}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div style={styles.detailsSection}>
          <h1 style={styles.title}>{artwork.name}</h1>
          <p style={styles.price}>{artwork.price} ETH</p>

          {blockchainData?.isResale && (
            <span style={styles.resaleBadge}>RESALE</span>
          )}

          <div style={styles.artistCard}>
            <h3 style={styles.sectionTitle}>Artist</h3>
            <p 
              style={styles.artistName}
              onClick={() => setShowArtistProfile(true)}
            >
              {artwork.seller_name || 'Unknown Artist'}
              {artwork.verification_status === 'verified' && (
                <span style={styles.verifiedBadge}> ✓</span>
              )}
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.description}>{artwork.description}</p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Details</h3>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <strong>Category:</strong> {artwork.category}
              </div>
              <div style={styles.detailItem}>
                <strong>Medium:</strong> {artwork.medium || 'N/A'}
              </div>
              <div style={styles.detailItem}>
                <strong>Dimensions:</strong> {artwork.dimensions || 'N/A'}
              </div>
              {blockchainData && (
                <div style={styles.detailItem}>
                  <strong>Ownership Count:</strong> {blockchainData.ownershipCount}
                </div>
              )}
            </div>
          </div>

          {artwork.tags && artwork.tags.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Tags</h3>
              <div style={styles.tagsContainer}>
                {artwork.tags.map((tag, index) => (
                  <span key={index} style={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <div style={styles.ownerBadge}>
              You own this artwork
            </div>
          )}

          {!artwork.is_sold && !isOwner && signer && (
            <button 
              onClick={handlePurchase}
              disabled={purchasing}
              style={styles.purchaseButton}
            >
              {purchasing ? 'Purchasing...' : 'Purchase Now'}
            </button>
          )}

          {artwork.is_sold && !isOwner && (
            <div style={styles.soldBadge}>
              This artwork has been sold
            </div>
          )}
        </div>
      </div>

      {/* Ownership History */}
      {ownershipHistory.length > 0 && (
        <div style={styles.historySection}>
          <h2 style={styles.sectionTitle}>Ownership History</h2>
          <div style={styles.timeline}>
            {ownershipHistory.map((record, index) => (
              <div key={index} style={styles.timelineItem}>
                <div style={styles.timelineDot}></div>
                <div style={styles.timelineContent}>
                  <p style={styles.timelineOwner}>
                    Owner: {record.owner.substring(0, 6)}...{record.owner.substring(38)}
                  </p>
                  <p style={styles.timelineDate}>
                    {new Date(record.timestamp * 1000).toLocaleString()}
                  </p>
                  <p style={styles.timelinePrice}>Price: {record.price} ETH</p>
                  {record.conditionReport && (
                    <span style={styles.conditionIndicator}>📋 Condition Report Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Artworks */}
      {similarArtworks.length > 0 && (
        <div style={styles.similarSection}>
          <h2 style={styles.sectionTitle}>Similar Artworks</h2>
          <div style={styles.similarGrid}>
            {similarArtworks.map((item) => (
              <div 
                key={item.id} 
                style={styles.similarCard}
                onClick={() => navigate(`/artwork/${item.id}`)}
              >
                <img 
                  src={item.ipfs_hash} 
                  alt={item.name}
                  style={styles.similarImage}
                />
                <p style={styles.similarName}>{item.name}</p>
                <p style={styles.similarPrice}>{item.price} ETH</p>
                {item.seller_name && (
                  <p style={styles.similarArtist}>by {item.seller_name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Artist Profile Modal */}
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

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px',
  },
  backButton: {
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginBottom: '40px',
  },
  imageSection: {
    position: 'sticky',
    top: '20px',
    height: 'fit-content',
  },
  mainImage: {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '15px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  additionalImages: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
  },
  thumbnail: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  price: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: 0,
  },
  resaleBadge: {
    display: 'inline-block',
    backgroundColor: '#f6ad55',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  artistCard: {
    backgroundColor: '#f7fafc',
    padding: '20px',
    borderRadius: '10px',
  },
  artistName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    cursor: 'pointer',
    margin: '10px 0 0 0',
  },
  verifiedBadge: {
    color: '#48bb78',
  },
  section: {
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '10px',
  },
  description: {
    color: '#4a5568',
    lineHeight: '1.7',
    fontSize: '16px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
  },
  detailItem: {
    color: '#4a5568',
    fontSize: '15px',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    backgroundColor: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    color: '#4a5568',
  },
  ownerBadge: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  purchaseButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },
  soldBadge: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  historySection: {
    marginTop: '40px',
    padding: '30px',
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
  },
  timeline: {
    position: 'relative',
    paddingLeft: '30px',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: '30px',
    paddingBottom: '30px',
    borderBottom: '1px solid #e2e8f0',
  },
  timelineDot: {
    position: 'absolute',
    left: '-35px',
    top: '5px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
  },
  timelineContent: {
    paddingLeft: '10px',
  },
  timelineOwner: {
    fontWeight: 'bold',
    color: '#2d3748',
    fontSize: '16px',
    marginBottom: '5px',
  },
  timelineDate: {
    color: '#718096',
    fontSize: '14px',
    marginBottom: '5px',
  },
  timelinePrice: {
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: '15px',
    marginBottom: '5px',
  },
  conditionIndicator: {
    display: 'inline-block',
    backgroundColor: '#bee3f8',
    color: '#2c5282',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  similarSection: {
    marginTop: '40px',
  },
  similarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  similarCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s',
  },
  similarImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  similarName: {
    padding: '10px 15px 5px',
    fontWeight: 'bold',
    color: '#2d3748',
    fontSize: '16px',
  },
  similarPrice: {
    padding: '0 15px 5px',
    color: '#667eea',
    fontWeight: 'bold',
    fontSize: '15px',
  },
  similarArtist: {
    padding: '0 15px 10px',
    color: '#718096',
    fontSize: '13px',
  },
};

export default ArtworkDetail;
