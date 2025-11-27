import React, { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { BACKEND_URL, LOCAL_CHAIN_ID } from '../contracts/MarketplaceV2';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kala_token'));
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize provider and check for existing auth
  useEffect(() => {
    initializeProvider();
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const initializeProvider = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());

      // Check if already connected
      try {
        const accounts = await web3Provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          const web3Signer = await web3Provider.getSigner();
          setSigner(web3Signer);
        }
      } catch (error) {
        console.error('Error initializing provider:', error);
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      logout();
    } else {
      setAccount(accounts[0]);
      // Re-authenticate with new account
      if (token) {
        logout();
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return null;
    }

    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await web3Provider.send('eth_requestAccounts', []);
      const userAddress = accounts[0];
      
      setProvider(web3Provider);
      setAccount(userAddress);
      
      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);

      return userAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      const walletAddress = account || await connectWallet();
      
      if (!walletAddress) {
        throw new Error('Failed to connect wallet');
      }

      // Step 1: Request nonce
      const nonceResponse = await axios.post(`${BACKEND_URL}/api/auth/nonce`, {
        walletAddress
      });

      const { message, nonce } = nonceResponse.data;

      // Step 2: Sign the message with MetaMask
      const signature = await signer.signMessage(message);

      // Step 3: Send signature to backend for verification
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        walletAddress,
        signature
      });

      const { token: authToken, user: userData } = loginResponse.data;

      // Save token and user data
      setToken(authToken);
      setUser(userData);
      localStorage.setItem('kala_token', authToken);
      localStorage.setItem('kala_user', JSON.stringify(userData));

      setLoading(false);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAccount(null);
    setSigner(null);
    localStorage.removeItem('kala_token');
    localStorage.removeItem('kala_user');
  };

  const fetchUserProfile = async () => {
    try {
      const storedUser = localStorage.getItem('kala_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/users/profile`,
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const updatedUser = { ...user, ...response.data };
      setUser(updatedUser);
      localStorage.setItem('kala_user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    account,
    provider,
    signer,
    loading,
    isAuthenticated: !!token && !!user,
    connectWallet,
    login,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
