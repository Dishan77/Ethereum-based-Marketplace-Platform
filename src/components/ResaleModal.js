import React, { useState } from 'react';
import { ethers } from 'ethers';
import { MARKETPLACE_V2_ABI } from '../contracts/MarketplaceV2';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ResaleModal = ({ item, signer, onClose, onSuccess }) => {
  const [newPrice, setNewPrice] = useState('');
  const [conditionReport, setConditionReport] = useState({
    overallCondition: '',
    physicalCondition: '',
    authenticityNotes: '',
    restorationHistory: '',
    storageConditions: '',
    additionalNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPrice || parseFloat(newPrice) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (!conditionReport.overallCondition || !conditionReport.physicalCondition) {
      alert('Overall condition and physical condition details are required');
      return;
    }

    try {
      setSubmitting(true);

      // Create condition report data
      const reportData = {
        artworkId: item.id,
        blockchainId: item.blockchain_id,
        reporterAddress: window.ethereum.selectedAddress,
        overallCondition: conditionReport.overallCondition,
        physicalCondition: conditionReport.physicalCondition,
        authenticityNotes: conditionReport.authenticityNotes,
        restorationHistory: conditionReport.restorationHistory,
        storageConditions: conditionReport.storageConditions,
        additionalNotes: conditionReport.additionalNotes,
        timestamp: new Date().toISOString()
      };

      // Generate hash of the condition report
      const reportHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(reportData))
      );

      // Save condition report to backend
      const token = localStorage.getItem('token');
      const reportResponse = await fetch(
        `http://localhost:3001/api/artworks/${item.id}/condition-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(reportData)
        }
      );

      if (!reportResponse.ok) {
        throw new Error('Failed to save condition report');
      }

      // Resell on blockchain
      const signerInstance = await signer;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_V2_ABI, signerInstance);
      
      const priceInWei = ethers.parseEther(newPrice);
      const resellTx = await contract.resellItem(item.blockchain_id, priceInWei);
      await resellTx.wait();

      // Add condition report hash to blockchain
      const reportTx = await contract.addConditionReport(item.blockchain_id, reportHash);
      await reportTx.wait();

      alert('Item listed for resale with condition report!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reselling item:', error);
      alert('Failed to resell: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Resell Artwork with Condition Report</h2>
        <p style={styles.subtitle}>
          Provide detailed condition information to build trust with potential buyers
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.section}>
            <label style={styles.label}>New Price (ETH) *</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              style={styles.input}
              placeholder="e.g., 1.5"
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Overall Condition *</label>
            <select
              value={conditionReport.overallCondition}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                overallCondition: e.target.value
              })}
              style={styles.select}
              required
            >
              <option value="">Select overall condition</option>
              <option value="excellent">Excellent - Like new</option>
              <option value="very_good">Very Good - Minimal wear</option>
              <option value="good">Good - Some visible wear</option>
              <option value="fair">Fair - Noticeable wear or damage</option>
              <option value="poor">Poor - Significant damage</option>
            </select>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Physical Condition Details *</label>
            <textarea
              value={conditionReport.physicalCondition}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                physicalCondition: e.target.value
              })}
              style={styles.textarea}
              placeholder="Describe any wear, scratches, fading, or damage in detail..."
              rows="4"
              required
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Authenticity & Provenance</label>
            <textarea
              value={conditionReport.authenticityNotes}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                authenticityNotes: e.target.value
              })}
              style={styles.textarea}
              placeholder="Certificates of authenticity, previous ownership, exhibition history..."
              rows="3"
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Restoration History</label>
            <textarea
              value={conditionReport.restorationHistory}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                restorationHistory: e.target.value
              })}
              style={styles.textarea}
              placeholder="Any repairs, cleaning, or restoration work performed..."
              rows="3"
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Storage & Care History</label>
            <textarea
              value={conditionReport.storageConditions}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                storageConditions: e.target.value
              })}
              style={styles.textarea}
              placeholder="How the artwork has been stored, climate control, display conditions..."
              rows="3"
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              value={conditionReport.additionalNotes}
              onChange={(e) => setConditionReport({
                ...conditionReport,
                additionalNotes: e.target.value
              })}
              style={styles.textarea}
              placeholder="Any other relevant information about the artwork's condition..."
              rows="3"
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Resell with Condition Report'}
            </button>
          </div>
        </form>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#718096',
    fontSize: '14px',
    marginBottom: '25px',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '30px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#4a5568',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 2,
    padding: '12px',
    border: 'none',
    backgroundColor: '#667eea',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default ResaleModal;
