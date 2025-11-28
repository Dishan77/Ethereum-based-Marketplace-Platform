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
      const profileResponse = await fetch(`http://localhost:3001/api/users/profile/${walletAddress}`);
      const profileData = await profileResponse.json();
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

  const stats = {
    total: artworks.length,
    sold: artworks.filter(a => a.is_sold).length,
    available: artworks.filter(a => !a.is_sold).length
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeButton}>×</button>
        
        <div style={styles.header}>
          <div style={styles.avatar}>
            {artist.name.charAt(0).toUpperCase()}
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.name}>{artist.name}</h2>
            <p style={styles.wallet}>
              {isAdminView ? walletAddress : `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`}
            </p>
            {artist.verification_status === 'verified' && (
              <span style={styles.verifiedBadge}>✓ Verified Artist</span>
            )}
          </div>
        </div>

        {artist.bio && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>About</h3>
            <p style={styles.bio}>{artist.bio}</p>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Artworks</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.sold}</div>
            <div style={styles.statLabel}>Sold</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.available}</div>
            <div style={styles.statLabel}>Available</div>
          </div>
        </div>

        {isAdminView && (
          <div style={styles.adminSection}>
            <h3 style={styles.sectionTitle}>Admin Information</h3>
            <div style={styles.adminGrid}>
              <div>
                <strong>Full Wallet:</strong>
                <p style={styles.adminValue}>{walletAddress}</p>
              </div>
              <div>
                <strong>Role:</strong>
                <p style={styles.adminValue}>{artist.role}</p>
              </div>
              <div>
                <strong>Account Created:</strong>
                <p style={styles.adminValue}>
                  {new Date(artist.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <strong>Profile Submission:</strong>
                <p style={styles.adminValue}>
                  {artist.profile_submitted_at 
                    ? new Date(artist.profile_submitted_at).toLocaleDateString()
                    : 'Not submitted'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Artworks ({artworks.length})</h3>
          <div style={styles.artworksGrid}>
            {artworks.slice(0, 6).map((artwork) => (
              <div key={artwork.id} style={styles.artworkCard}>
                <img 
                  src={artwork.ipfs_hash} 
                  alt={artwork.name}
                  style={styles.artworkImage}
                />
                <p style={styles.artworkName}>{artwork.name}</p>
                <p style={styles.artworkPrice}>{artwork.price} ETH</p>
                {artwork.is_sold && <span style={styles.soldBadge}>Sold</span>}
              </div>
            ))}
          </div>
          {artworks.length > 6 && (
            <p style={styles.moreText}>And {artworks.length - 6} more...</p>
          )}
        </div>
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
