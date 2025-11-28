import React, { useState, useEffect } from 'react';

const ArtistProfile = ({ walletAddress, isAdminView = false, onClose }) => {
  const [artist, setArtist] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtistProfile();
  }, [walletAddress]);

  const fetchArtistProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch artist profile
      let profileData;
      try {
        // Try to fetch detailed artist profile first
        const response = await fetch(`http://localhost:3001/api/users/artist-profile/${walletAddress}`);
        if (response.ok) {
          profileData = await response.json();
        } else {
          throw new Error('Artist profile not found');
        }
      } catch (err) {
        // Fallback to basic user profile
        const response = await fetch(`http://localhost:3001/api/users/profile/${walletAddress}`);
        profileData = await response.json();
      }
      
      setArtist(profileData);

      // Fetch artist's artworks
      const artworksResponse = await fetch(`http://localhost:3001/api/artworks?seller=${walletAddress}`);
      const artworksData = await artworksResponse.json();
      setArtworks(artworksData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>Artist not found</p>
          <button onClick={onClose} style={styles.closeButton}>Close</button>
        </div>
      </div>
    );
  }

  const renderPortfolioImages = () => {
    if (!artist.portfolio_images) return null;
    
    let images = [];
    try {
      images = typeof artist.portfolio_images === 'string' 
        ? JSON.parse(artist.portfolio_images) 
        : artist.portfolio_images;
    } catch (e) {
      console.error('Error parsing portfolio images:', e);
      return null;
    }

    if (!images || images.length === 0) return null;

    return (
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Portfolio Images</h3>
        <div style={styles.artworksGrid}>
          {images.map((img, index) => (
            <div key={index} style={styles.artworkCard}>
              <img 
                src={`http://localhost:3001${img}`} 
                alt={`Portfolio ${index + 1}`}
                style={styles.artworkImage}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton}>×</button>
        
        <div style={styles.header}>
          <div style={styles.avatar}>
            {(artist.artist_name || artist.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.name}>{artist.artist_name || artist.name || 'Unnamed Artist'}</h2>
            <p style={styles.wallet}>
              {isAdminView ? walletAddress : `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`}
            </p>
            {artist.verification_status === 'verified' && (
              <span style={styles.verifiedBadge}>✓ Verified Artist</span>
            )}
          </div>
        </div>

        <div style={styles.adminSection}>
          <h3 style={styles.sectionTitle}>Registration Details</h3>
          <div style={styles.adminGrid}>
            <div>
              <strong>Full Wallet:</strong>
              <p style={styles.adminValue}>{walletAddress}</p>
            </div>
            <div>
              <strong>Date of Birth:</strong>
              <p style={styles.adminValue}>
                {artist.date_of_birth ? new Date(artist.date_of_birth).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <strong>Email:</strong>
              <p style={styles.adminValue}>{artist.email || 'N/A'}</p>
            </div>
            <div>
              <strong>Phone:</strong>
              <p style={styles.adminValue}>{artist.phone || 'N/A'}</p>
            </div>
            <div>
              <strong>Location:</strong>
              <p style={styles.adminValue}>
                {[artist.city, artist.country].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
            <div>
              <strong>Address:</strong>
              <p style={styles.adminValue}>{artist.address || 'N/A'}</p>
            </div>
            <div>
              <strong>Experience:</strong>
              <p style={styles.adminValue}>{artist.experience || 'N/A'}</p>
            </div>
            <div>
              <strong>Education:</strong>
              <p style={styles.adminValue}>{artist.education || 'N/A'}</p>
            </div>
            <div>
              <strong>Expertise:</strong>
              <p style={styles.adminValue}>{artist.expertise || 'N/A'}</p>
            </div>
            <div>
              <strong>Certifications:</strong>
              <p style={styles.adminValue}>{artist.certifications || 'N/A'}</p>
            </div>
            <div>
              <strong>Website:</strong>
              <p style={styles.adminValue}>
                {artist.website ? (
                  <a href={artist.website} target="_blank" rel="noopener noreferrer">{artist.website}</a>
                ) : 'N/A'}
              </p>
            </div>
          </div>
          
          {artist.art_styles && (
            <div style={{marginTop: '15px'}}>
              <strong>Art Styles:</strong>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px'}}>
                {(typeof artist.art_styles === 'string' ? JSON.parse(artist.art_styles) : artist.art_styles).map((style, idx) => (
                  <span key={idx} style={{
                    backgroundColor: '#e2e8f0',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {style}
                  </span>
                ))}
              </div>
            </div>
          )}

          {artist.social_media && (
            <div style={{marginTop: '15px'}}>
              <strong>Social Media:</strong>
              <div style={{display: 'flex', gap: '15px', marginTop: '5px'}}>
                {Object.entries(typeof artist.social_media === 'string' ? JSON.parse(artist.social_media) : artist.social_media).map(([platform, handle]) => (
                  handle && (
                    <span key={platform} style={styles.adminValue}>
                      {platform}: {handle}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {artist.bio && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Bio</h3>
            <p style={styles.bio}>{artist.bio}</p>
          </div>
        )}

        {renderPortfolioImages()}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '30px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    marginRight: '20px',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    margin: '0 0 5px 0',
    fontSize: '28px',
    color: '#2d3748',
  },
  wallet: {
    margin: '5px 0',
    color: '#718096',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  verifiedBadge: {
    display: 'inline-block',
    backgroundColor: '#48bb78',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#2d3748',
  },
  bio: {
    color: '#4a5568',
    lineHeight: '1.6',
    fontSize: '15px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#f7fafc',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '5px',
  },
  statLabel: {
    color: '#718096',
    fontSize: '14px',
  },
  adminSection: {
    backgroundColor: '#fff5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
  },
  adminValue: {
    color: '#4a5568',
    fontSize: '14px',
    marginTop: '5px',
  },
  artworksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
  },
  artworkCard: {
    position: 'relative',
  },
  artworkImage: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  artworkName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '5px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artworkPrice: {
    fontSize: '14px',
    color: '#667eea',
    fontWeight: 'bold',
    margin: '5px 0',
  },
  soldBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(237, 100, 166, 0.9)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  moreText: {
    textAlign: 'center',
    color: '#718096',
    marginTop: '15px',
    fontStyle: 'italic',
  },
};

export default ArtistProfile;
