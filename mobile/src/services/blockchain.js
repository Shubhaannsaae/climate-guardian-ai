import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchainAPI } from './api';

class BlockchainService {
  constructor() {
    this.verificationCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Verify data integrity using blockchain
  async verifyDataIntegrity(dataHash) {
    try {
      // Check cache first
      const cached = this.verificationCache.get(dataHash);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }

      // Verify with blockchain
      const response = await blockchainAPI.verifyData(dataHash);
      const result = {
        verified: response.data.verified,
        validator: response.data.validator,
        timestamp: response.data.timestamp,
        reputation_score: response.data.reputation_score,
        confidence: response.data.confidence,
      };

      // Cache result
      this.verificationCache.set(dataHash, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      return {
        verified: false,
        error: 'Verification failed',
      };
    }
  }

  // Get data provenance information
  async getDataProvenance(dataId) {
    try {
      const response = await blockchainAPI.getDataProvenance(dataId);
      return {
        origin: response.data.origin,
        validators: response.data.validators,
        validation_history: response.data.validation_history,
        reputation_scores: response.data.reputation_scores,
        trust_score: response.data.trust_score,
      };
    } catch (error) {
      console.error('Error getting data provenance:', error);
      return null;
    }
  }

  // Submit data for verification
  async submitDataForVerification(data) {
    try {
      const response = await blockchainAPI.submitDataVerification(data);
      return {
        success: true,
        proof_id: response.data.proof_id,
        transaction_hash: response.data.transaction_hash,
        estimated_verification_time: response.data.estimated_verification_time,
      };
    } catch (error) {
      console.error('Error submitting data for verification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get validator reputation
  async getValidatorReputation(validatorAddress) {
    try {
      const response = await blockchainAPI.getValidatorReputation(validatorAddress);
      return {
        reputation_score: response.data.reputation_score,
        total_validations: response.data.total_validations,
        successful_validations: response.data.successful_validations,
        accuracy_rate: response.data.accuracy_rate,
        last_activity: response.data.last_activity,
        trust_level: this.calculateTrustLevel(response.data.reputation_score),
      };
    } catch (error) {
      console.error('Error getting validator reputation:', error);
      return null;
    }
  }

  // Calculate trust level based on reputation score
  calculateTrustLevel(reputationScore) {
    if (reputationScore >= 90) return 'Very High';
    if (reputationScore >= 75) return 'High';
    if (reputationScore >= 60) return 'Medium';
    if (reputationScore >= 40) return 'Low';
    return 'Very Low';
  }

  // Get blockchain network status
  async getNetworkStatus() {
    try {
      const response = await blockchainAPI.getNetworkStatus();
      return {
        connected: response.data.connected,
        latest_block: response.data.latest_block,
        network_id: response.data.network_id,
        gas_price: response.data.gas_price,
        peer_count: response.data.peer_count,
        sync_status: response.data.sync_status,
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  // Generate data hash for verification
  generateDataHash(data) {
    try {
      // Simple hash generation (in production, use proper cryptographic hash)
      const dataString = JSON.stringify(data, Object.keys(data).sort());
      return this.simpleHash(dataString);
    } catch (error) {
      console.error('Error generating data hash:', error);
      return null;
    }
  }

  // Simple hash function (replace with proper crypto hash in production)
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  // Verify climate data authenticity
  async verifyClimateData(climateData) {
    try {
      const dataHash = this.generateDataHash({
        temperature: climateData.temperature,
        humidity: climateData.humidity,
        pressure: climateData.pressure,
        timestamp: climateData.timestamp,
        location: climateData.location,
      });

      if (!dataHash) {
        return { verified: false, error: 'Could not generate data hash' };
      }

      const verification = await this.verifyDataIntegrity(dataHash);
      
      return {
        verified: verification.verified,
        confidence: verification.confidence || 0,
        validator: verification.validator,
        trust_score: verification.reputation_score || 0,
        data_hash: dataHash,
      };
    } catch (error) {
      console.error('Error verifying climate data:', error);
      return { verified: false, error: error.message };
    }
  }

  // Verify emergency alert authenticity
  async verifyEmergencyAlert(alertData) {
    try {
      const dataHash = this.generateDataHash({
        title: alertData.title,
        severity: alertData.severity,
        location: alertData.location,
        issued_at: alertData.issued_at,
        issuer: alertData.issuer,
      });

      if (!dataHash) {
        return { verified: false, error: 'Could not generate data hash' };
      }

      const verification = await this.verifyDataIntegrity(dataHash);
      
      return {
        verified: verification.verified,
        confidence: verification.confidence || 0,
        validator: verification.validator,
        trust_score: verification.reputation_score || 0,
        data_hash: dataHash,
        official: verification.verified && verification.reputation_score > 80,
      };
    } catch (error) {
      console.error('Error verifying emergency alert:', error);
      return { verified: false, error: error.message };
    }
  }

  // Get verification status for multiple data items
  async batchVerifyData(dataItems) {
    try {
      const verificationPromises = dataItems.map(async (item) => {
        const dataHash = this.generateDataHash(item);
        if (!dataHash) return { verified: false, error: 'Hash generation failed' };
        
        const verification = await this.verifyDataIntegrity(dataHash);
        return {
          id: item.id,
          verified: verification.verified,
          confidence: verification.confidence || 0,
          data_hash: dataHash,
        };
      });

      const results = await Promise.all(verificationPromises);
      return results;
    } catch (error) {
      console.error('Error in batch verification:', error);
      return [];
    }
  }

  // Store verification result locally
  async storeVerificationResult(dataId, verificationResult) {
    try {
      const key = `verification_${dataId}`;
      const data = {
        ...verificationResult,
        cached_at: Date.now(),
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing verification result:', error);
    }
  }

  // Get stored verification result
  async getStoredVerificationResult(dataId) {
    try {
      const key = `verification_${dataId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if cache is still valid (1 hour)
        if (Date.now() - data.cached_at < 3600000) {
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting stored verification result:', error);
      return null;
    }
  }

  // Clear verification cache
  clearCache() {
    this.verificationCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.verificationCache.size,
      timeout: this.cacheTimeout,
    };
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

export default blockchainService;

export const {
  verifyDataIntegrity,
  getDataProvenance,
  submitDataForVerification,
  getValidatorReputation,
  getNetworkStatus,
  generateDataHash,
  verifyClimateData,
  verifyEmergencyAlert,
  batchVerifyData,
  storeVerificationResult,
  getStoredVerificationResult,
  clearCache,
  getCacheStats,
} = blockchainService;
