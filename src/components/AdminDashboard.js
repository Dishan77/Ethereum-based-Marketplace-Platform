import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL, CONTRACT_ADDRESS, MARKETPLACE_V2_ABI } from '../contracts/MarketplaceV2';
import { ethers } from 'ethers';

const AdminDashboard = () => {
  const { user, token, provider } = useAuth();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    totalArtworks: 0,
    totalSales: 0,
    totalRevenue: '0',
    pendingVerifications: 0,
    verifiedSellers: 0,
    customers: 0,
    activeSales: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllData();
    }
  }, [user, token, provider]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPendingVerifications(),
        fetchAllUsers(),
        fetchAllArtworks(),
        fetchBlockchainStats()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users/pending-verifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingVerifications(response.data);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data);
      
      const stats = {
        totalUsers: response.data.length,
        pendingVerifications: response.data.filter(u => u.verification_status === 'pending').length,
        verifiedSellers: response.data.filter(u => u.role === 'seller' && u.verification_status === 'verified').length,
        customers: response.data.filter(u => u.role === 'customer').length
      };
      
      setStatistics(prev => ({ ...prev, ...stats }));
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const fetchAllArtworks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artworks`);
      setAllArtworks(response.data);
      
      setStatistics(prev => ({
        ...prev,
        totalArtworks: response.data.length,
        activeSales: response.data.filter(a => !a.is_sold).length
      }));
    } catch (error) {
      console.error('Error fetching all artworks:', error);
    }
  };

  const fetchBlockchainStats = async () => {
    try {
      if (!provider) return;
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, provider);
      const itemCount = await contract.itemCount();
      
      let totalRevenue = 0n; // Use BigInt instead of BigNumber
      let soldCount = 0;
      
      for (let i = 1; i <= Number(itemCount); i++) {
        const item = await contract.items(i);
        if (item.isSold) {
          totalRevenue = totalRevenue + item.price;
          soldCount++;
        }
      }
      
      setStatistics(prev => ({
        ...prev,
        totalSales: soldCount,
        totalRevenue: ethers.formatEther(totalRevenue)
      }));
    } catch (error) {
      console.error('Error fetching blockchain stats:', error);
    }
  };

  const handleVerification = async (walletAddress, status) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/users/verify-seller/${walletAddress}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Seller ${status === 'verified' ? 'approved' : 'rejected'} successfully`);
      fetchAllData();
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Failed to update verification status');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You need admin privileges to access this dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Manage and monitor your marketplace
          </p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '30px', borderBottom: '2px solid #e0e0e0', backgroundColor: 'white', borderRadius: '8px 8px 0 0', padding: '0 20px' }}>
          {['overview', 'verifications', 'users', 'artworks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '15px 30px',
                marginRight: '5px',
                backgroundColor: activeTab === tab ? '#667eea' : 'transparent',
                color: activeTab === tab ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #667eea' : 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                transition: 'all 0.3s'
              }}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'verifications' && `✅ Verifications (${pendingVerifications.length})`}
              {tab === 'users' && `👥 All Users (${allUsers.length})`}
              {tab === 'artworks' && `🎨 Artworks (${allArtworks.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '30px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 style={{ marginBottom: '30px', color: '#333' }}>Platform Statistics</h2>
                  
                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.totalUsers}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Users</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.verifiedSellers}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Verified Artists</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.customers}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Customers</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.pendingVerifications}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Pending Verifications</div>
                    </div>
                  </div>

                  {/* Artworks & Sales Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.totalArtworks}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Artworks</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.activeSales}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Listings</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {statistics.totalSales}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Sales</div>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {parseFloat(statistics.totalRevenue).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Revenue (ETH)</div>
                    </div>
                  </div>

                  {/* System Status */}
                  <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ marginBottom: '15px', color: '#333' }}>System Status</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontSize: '20px' }}>✓</span>
                        <span>Blockchain Connected</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontSize: '20px' }}>✓</span>
                        <span>Database Connected</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontSize: '20px' }}>✓</span>
                        <span>API Online</span>
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        <strong>Contract:</strong> <code>{CONTRACT_ADDRESS}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verifications Tab */}
              {activeTab === 'verifications' && (
                <div>
                  <h2 style={{ marginBottom: '20px', color: '#333' }}>Seller Verification Requests</h2>
                  {pendingVerifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
                      <p>No pending verification requests</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {pendingVerifications.map((seller) => (
                        <div
                          key={seller.wallet_address}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '20px',
                            backgroundColor: '#fafafa'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                                {seller.name || 'Unnamed Seller'}
                              </h3>
                              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                                <strong>Wallet:</strong> <code style={{ fontSize: '12px' }}>{seller.wallet_address}</code>
                              </p>
                              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                                <strong>Government ID:</strong> {seller.govt_id || 'Not provided'}
                              </p>
                              <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>
                                Requested: {new Date(seller.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => handleVerification(seller.wallet_address, 'verified')}
                                style={{
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  padding: '10px 20px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleVerification(seller.wallet_address, 'rejected')}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  padding: '10px 20px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <h2 style={{ marginBottom: '20px', color: '#333' }}>All Users</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Wallet Address</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Role</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u) => (
                          <tr key={u.wallet_address} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', fontSize: '14px' }}>{u.name || 'Unnamed'}</td>
                            <td style={{ padding: '12px', fontSize: '12px' }}>
                              <code>{u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}</code>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: u.role === 'admin' ? '#dbeafe' : u.role === 'seller' ? '#dcfce7' : '#fef3c7',
                                color: u.role === 'admin' ? '#1e40af' : u.role === 'seller' ? '#166534' : '#854d0e'
                              }}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {u.role === 'seller' && (
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  backgroundColor: u.verification_status === 'verified' ? '#dcfce7' : '#fee2e2',
                                  color: u.verification_status === 'verified' ? '#166534' : '#991b1b'
                                }}>
                                  {u.verification_status.toUpperCase()}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Artworks Tab */}
              {activeTab === 'artworks' && (
                <div>
                  <h2 style={{ marginBottom: '20px', color: '#333' }}>All Artworks</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {allArtworks.map((artwork) => (
                      <div
                        key={artwork.id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: 'white'
                        }}
                      >
                        <div style={{ padding: '15px' }}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>
                            {artwork.name}
                          </h3>
                          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                            <strong>Price:</strong> {artwork.price} ETH
                          </p>
                          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                            <strong>Category:</strong> {artwork.category || 'Uncategorized'}
                          </p>
                          <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                            <strong>Seller:</strong><br />
                            <code>{artwork.seller_address?.slice(0, 6)}...{artwork.seller_address?.slice(-4)}</code>
                          </p>
                          <div style={{ marginTop: '10px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: artwork.is_sold ? '#fee2e2' : '#dcfce7',
                              color: artwork.is_sold ? '#991b1b' : '#166534'
                            }}>
                              {artwork.is_sold ? 'SOLD' : 'AVAILABLE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
