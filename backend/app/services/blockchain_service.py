"""Blockchain service for data verification and emergency alerts."""

import logging
import json
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.blockchain import blockchain_manager
from app.core.config import settings

logger = logging.getLogger(__name__)


class BlockchainService:
    """Service for blockchain interactions."""
    
    def __init__(self):
        """Initialize blockchain service."""
        self.blockchain = blockchain_manager
    
    async def submit_data_proof(
        self,
        data_hash: str,
        ipfs_cid: str,
        data_type: str,
        submitter: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Submit data proof to blockchain."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # Submit to blockchain
            tx_hash = self.blockchain.submit_data_proof(data_hash, ipfs_cid)
            
            if tx_hash:
                return {
                    "transaction_hash": tx_hash,
                    "proof_id": data_hash,
                    "ipfs_cid": ipfs_cid,
                    "data_type": data_type,
                    "submitter": submitter,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error submitting data proof: {e}")
            return None
    
    async def verify_data_proof(
        self,
        proof_id: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Verify data proof on blockchain."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # Get proof from blockchain
            proof = self.blockchain.verify_data_proof(proof_id)
            
            if proof:
                return {
                    "proof_id": proof_id,
                    "ipfs_hash": proof.get("ipfs_hash"),
                    "validator": proof.get("validator"),
                    "timestamp": proof.get("timestamp"),
                    "reputation_score": proof.get("reputation_score"),
                    "verified": True
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error verifying data proof: {e}")
            return None
    
    async def submit_emergency_alert(
        self,
        alert_id: str,
        alert_data: Dict[str, Any],
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Submit emergency alert to blockchain."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # Prepare alert data for blockchain
            blockchain_alert_data = {
                "severity": alert_data.get("severity", "medium"),
                "location": f"{alert_data.get('latitude', 0)},{alert_data.get('longitude', 0)}",
                "message": alert_data.get("description", "Emergency alert")
            }
            
            # Submit to blockchain
            tx_hash = self.blockchain.trigger_emergency_alert(blockchain_alert_data)
            
            if tx_hash:
                return {
                    "transaction_hash": tx_hash,
                    "alert_id": alert_id,
                    "status": "confirmed",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error submitting emergency alert: {e}")
            return None
    
    async def update_emergency_alert(
        self,
        alert_id: str,
        alert_data: Dict[str, Any],
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Update emergency alert on blockchain."""
        try:
            # For this implementation, we'll create a new transaction
            # In production, you might want to implement an update function
            return await self.submit_emergency_alert(alert_id, alert_data, db)
            
        except Exception as e:
            logger.error(f"Error updating emergency alert: {e}")
            return None
    
    async def get_transaction_status(
        self,
        tx_hash: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Get blockchain transaction status."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # Get transaction receipt
            receipt = self.blockchain.w3.eth.get_transaction_receipt(tx_hash)
            
            if receipt:
                return {
                    "transaction_hash": tx_hash,
                    "status": "confirmed" if receipt.status == 1 else "failed",
                    "block_number": receipt.blockNumber,
                    "gas_used": receipt.gasUsed,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting transaction status: {e}")
            return None
    
    async def get_network_status(self) -> Dict[str, Any]:
        """Get blockchain network status."""
        try:
            if not self.blockchain.is_connected():
                return {
                    "connected": False,
                    "error": "Not connected to blockchain network"
                }
            
            # Get network information
            latest_block = self.blockchain.w3.eth.block_number
            gas_price = self.blockchain.w3.eth.gas_price
            
            return {
                "connected": True,
                "latest_block": latest_block,
                "network_id": self.blockchain.w3.net.version,
                "gas_price": gas_price,
                "peer_count": self.blockchain.w3.net.peer_count
            }
            
        except Exception as e:
            logger.error(f"Error getting network status: {e}")
            return {
                "connected": False,
                "error": str(e)
            }
    
    async def get_validator_reputation(
        self,
        validator_address: str,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Get validator reputation score."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # This would typically call a smart contract function
            # For now, return mock data
            return {
                "score": 85.5,
                "total_validations": 150,
                "successful_validations": 142,
                "last_activity": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting validator reputation: {e}")
            return None
    
    async def submit_community_validation(
        self,
        proof_id: str,
        validator_address: str,
        validation_result: bool,
        comments: Optional[str],
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """Submit community validation for data proof."""
        try:
            if not self.blockchain.is_connected():
                logger.error("Blockchain not connected")
                return None
            
            # Create validation hash
            validation_data = {
                "proof_id": proof_id,
                "validator": validator_address,
                "result": validation_result,
                "comments": comments or "",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            validation_hash = hashlib.sha256(
                json.dumps(validation_data, sort_keys=True).encode()
            ).hexdigest()
            
            # Submit validation (mock implementation)
            # In production, this would call a smart contract function
            tx_hash = f"0x{validation_hash[:64]}"
            
            return {
                "transaction_hash": tx_hash,
                "proof_id": proof_id,
                "validation_result": validation_result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error submitting community validation: {e}")
            return None
    
    def generate_data_hash(self, data: Dict[str, Any]) -> str:
        """Generate hash for data verification."""
        try:
            # Sort data keys for consistent hashing
            data_string = json.dumps(data, sort_keys=True)
            return hashlib.sha256(data_string.encode()).hexdigest()
            
        except Exception as e:
            logger.error(f"Error generating data hash: {e}")
            return ""
    
    def verify_data_integrity(self, data: Dict[str, Any], expected_hash: str) -> bool:
        """Verify data integrity using hash."""
        try:
            calculated_hash = self.generate_data_hash(data)
            return calculated_hash == expected_hash
            
        except Exception as e:
            logger.error(f"Error verifying data integrity: {e}")
            return False
