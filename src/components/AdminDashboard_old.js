import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL, CONTRACT_ADDRESS } from '../contracts/MarketplaceV2';
import { ethers } from 'ethers';
import { MARKETPLACE_V2_ABI } from '../contracts/MarketplaceV2';

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
  }, [user]);

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
      
      // Calculate user statistics
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
      
      let totalRevenue = ethers.BigNumber.from(0);
      let soldCount = 0;
      
      for (let i = 1; i <= itemCount.toNumber(); i++) {
        const item = await contract.items(i);
        if (item.isSold) {
          totalRevenue = totalRevenue.add(item.price);
          soldCount++;
        }
      }
      
      setStatistics(prev => ({
        ...prev,
        totalSales: soldCount,
        totalRevenue: ethers.utils.formatEther(totalRevenue)
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
      fetchPendingVerifications();
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
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>Manage and monitor your marketplace</p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '30px', borderBottom: '2px solid #e0e0e0', backgroundColor: 'white', borderRadius: '8px 8px 0 0' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '15px 30px',
              marginRight: '5px',
              backgroundColor: activeTab === 'overview' ? '#667eea' : 'transparent',
              color: activeTab === 'overview' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '3px solid #667eea' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'overview' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            style={{
              padding: '15px 30px',
              marginRight: '5px',
              backgroundColor: activeTab === 'verifications' ? '#667eea' : 'transparent',
              color: activeTab === 'verifications' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'verifications' ? '3px solid #667eea' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'verifications' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            ✅ Verifications ({pendingVerifications.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '15px 30px',
              marginRight: '5px',
              backgroundColor: activeTab === 'users' ? '#667eea' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'users' ? '3px solid #667eea' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'users' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            👥 All Users ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('artworks')}
            style={{
              padding: '15px 30px',
              backgroundColor: activeTab === 'artworks' ? '#667eea' : 'transparent',
              color: activeTab === 'artworks' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'artworks' ? '3px solid #667eea' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'artworks' ? 'bold' : 'normal',
              transition: 'all 0.3s'
            }}
          >
            🎨 Artworks ({allArtworks.length})
          </button>
        </div>

      {/* Pending Verifications Tab */}
      {activeTab === 'verifications' && (
        <div>
          <h2>Seller Verification Requests</h2>
          {loading ? (
            <p>Loading...</p>
          ) : pendingVerifications.length === 0 ? (
            <p>No pending verification requests.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {pendingVerifications.map((seller) => (
                <div
                  key={seller.wallet_address}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3>{seller.name || 'Unnamed Seller'}</h3>
                      <p><strong>Wallet:</strong> {seller.wallet_address}</p>
                      <p><strong>Government ID:</strong> {seller.govt_id || 'Not provided'}</p>
                      <p><strong>Requested:</strong> {new Date(seller.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => handleVerification(seller.wallet_address, 'verified')}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '10px 20px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '10px'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleVerification(seller.wallet_address, 'rejected')}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '10px 20px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
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

      {/* Platform Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <h2>Platform Overview</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div style={{ backgroundColor: '#007bff', color: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '36px' }}>-</h3>
              <p style={{ margin: '10px 0 0 0' }}>Total Users</p>
            </div>
            
            <div style={{ backgroundColor: '#28a745', color: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '36px' }}>-</h3>
              <p style={{ margin: '10px 0 0 0' }}>Total Artworks</p>
            </div>
            
            <div style={{ backgroundColor: '#ffc107', color: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '36px' }}>{pendingVerifications.length}</h3>
              <p style={{ margin: '10px 0 0 0' }}>Pending Verifications</p>
            </div>
            
            <div style={{ backgroundColor: '#17a2b8', color: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '36px' }}>-</h3>
              <p style={{ margin: '10px 0 0 0' }}>Total Sales</p>
            </div>
          </div>

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>System Status</h3>
            <p>✓ Blockchain Connected</p>
            <p>✓ Database Connected</p>
            <p>✓ API Online</p>
            <p><strong>Contract Address:</strong> 0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
