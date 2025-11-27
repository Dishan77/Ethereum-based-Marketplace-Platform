import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SellerDashboard from "./components/SellerDashboard";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Access Denied</h2>
      <p>You don't have permission to access this page.</p>
      <Link to="/">Go to Home</Link>
    </div>;
  }

  return children;
};

// Home/Login Page with Role Selection
const HomePage = () => {
  const { connectWallet, login, isAuthenticated, user, loading, account } = useAuth();
  const [selectedRole, setSelectedRole] = React.useState(null);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleRoleLogin = async (role) => {
    try {
      setSelectedRole(role);
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setSelectedRole(null);
    }
  };

  if (isAuthenticated && user) {
    // Redirect based on selected role or user's role
    const targetRole = selectedRole || user.role;
    if (targetRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (targetRole === 'seller') {
      return <Navigate to="/seller" replace />;
    } else {
      return <Navigate to="/customer" replace />;
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ margin: 0, fontSize: '48px', fontWeight: 'bold' }}>KALA 2.0</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '18px', opacity: 0.9 }}>
            Blockchain-Based Artwork Marketplace
          </p>
        </div>

        <div style={{ padding: '40px' }}>
          {!account ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#333', marginBottom: '20px' }}>Welcome</h2>
              <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
                Connect your MetaMask wallet to get started
              </p>
              <button
                onClick={handleConnect}
                disabled={loading}
                style={{
                  padding: '16px 48px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(102,126,234,0.4)'
                }}
                onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.target.style.transform = 'translateY(0)')}
              >
                {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ color: '#333', marginBottom: '10px' }}>Choose Your Role</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Connected: <code style={{ color: '#667eea', fontSize: '12px' }}>{account.slice(0, 6)}...{account.slice(-4)}</code>
                </p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* Admin Card */}
                <div
                  onClick={() => !loading && handleRoleLogin('admin')}
                  style={{
                    padding: '30px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: selectedRole === 'admin' ? '#f0f4ff' : 'white',
                    borderColor: selectedRole === 'admin' ? '#667eea' : '#e2e8f0'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedRole !== 'admin') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>👨‍💼</div>
                  <h3 style={{ color: '#333', marginBottom: '10px' }}>Admin</h3>
                  <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                    Manage users, verify sellers, and oversee platform operations
                  </p>
                </div>

                {/* Artist/Seller Card */}
                <div
                  onClick={() => !loading && handleRoleLogin('seller')}
                  style={{
                    padding: '30px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: selectedRole === 'seller' ? '#f0fdf4' : 'white',
                    borderColor: selectedRole === 'seller' ? '#10b981' : '#e2e8f0'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedRole !== 'seller') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎨</div>
                  <h3 style={{ color: '#333', marginBottom: '10px' }}>Artist</h3>
                  <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                    List and sell your artworks to global buyers
                  </p>
                </div>

                {/* Customer Card */}
                <div
                  onClick={() => !loading && handleRoleLogin('customer')}
                  style={{
                    padding: '30px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: selectedRole === 'customer' ? '#fef3f2' : 'white',
                    borderColor: selectedRole === 'customer' ? '#f97316' : '#e2e8f0'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedRole !== 'customer') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛍️</div>
                  <h3 style={{ color: '#333', marginBottom: '10px' }}>Customer</h3>
                  <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                    Browse and purchase unique artworks from verified artists
                  </p>
                </div>
              </div>

              {loading && selectedRole && (
                <div style={{ textAlign: 'center', color: '#667eea' }}>
                  <p>Authenticating as {selectedRole}...</p>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
              <strong>Test Accounts:</strong> Admin (0xf39F...2266) • Artist (0x7099...79C8) • Customer (0x3C44...93BC)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Navigation Header
const Navigation = () => {
  const { user, logout, account, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <nav style={{
      backgroundColor: '#333',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>KALA 2.0</h2>
        {user?.role === 'admin' && <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>Admin</Link>}
        {(user?.role === 'seller' || user?.role === 'admin') && <Link to="/seller" style={{ color: 'white', textDecoration: 'none' }}>Seller</Link>}
        <Link to="/customer" style={{ color: 'white', textDecoration: 'none' }}>Marketplace</Link>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px' }}>
          {user?.name || 'User'} ({user?.role}) <br />
          <code style={{ fontSize: '10px' }}>{account?.slice(0, 6)}...{account?.slice(-4)}</code>
        </span>
        <button
          onClick={logout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/seller"
            element={
              <ProtectedRoute allowedRoles={['customer', 'seller', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['customer', 'seller', 'admin']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
