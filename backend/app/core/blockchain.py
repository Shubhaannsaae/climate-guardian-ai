"""Blockchain core utilities."""

import json
import logging
from typing import Dict, Any, Optional
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from hexbytes import HexBytes

from app.core.config import settings

logger = logging.getLogger(__name__)


class BlockchainManager:
    """Blockchain interaction manager."""
    
    def __init__(self):
        """Initialize blockchain connection."""
        self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
        
        # Add PoA middleware for development networks
        if "localhost" in settings.WEB3_PROVIDER_URL or "127.0.0.1" in settings.WEB3_PROVIDER_URL:
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Set up account
        self.account = Account.from_key(settings.PRIVATE_KEY)
        self.w3.eth.default_account = self.account.address
        
        # Load contract ABI and address
        self.contract_abi = self._load_contract_abi()
        self.contract_address = settings.CONTRACT_ADDRESS
        
        if self.contract_address:
            self.contract = self.w3.eth.contract(
                address=self.contract_address,
                abi=self.contract_abi
            )
    
    def _load_contract_abi(self) -> list:
        """Load contract ABI from file."""
        try:
            with open("./contracts/ClimateDataVerification.json", "r") as f:
                contract_json = json.load(f)
                return contract_json["abi"]
        except FileNotFoundError:
            logger.warning("Contract ABI file not found, using default ABI")
            return []
    
    def is_connected(self) -> bool:
        """Check if connected to blockchain."""
        try:
            return self.w3.isConnected()
        except Exception as e:
            logger.error(f"Blockchain connection error: {e}")
            return False
    
    def get_gas_price(self) -> int:
        """Get current gas price."""
        try:
            return self.w3.eth.gas_price
        except Exception as e:
            logger.error(f"Error getting gas price: {e}")
            return self.w3.toWei('20', 'gwei')  # Fallback gas price
    
    def submit_data_proof(self, data_hash: str, ipfs_cid: str) -> Optional[str]:
        """Submit data proof to blockchain."""
        if not self.contract:
            logger.error("Contract not initialized")
            return None
        
        try:
            # Build transaction
            transaction = self.contract.functions.submitProof(
                data_hash.encode(),
                ipfs_cid
            ).buildTransaction({
                'from': self.account.address,
                'gas': 200000,
                'gasPrice': self.get_gas_price(),
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, settings.PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                logger.info(f"Data proof submitted successfully: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                logger.error(f"Transaction failed: {tx_hash.hex()}")
                return None
                
        except Exception as e:
            logger.error(f"Error submitting data proof: {e}")
            return None
    
    def verify_data_proof(self, proof_id: str) -> Optional[Dict[str, Any]]:
        """Verify data proof on blockchain."""
        if not self.contract:
            logger.error("Contract not initialized")
            return None
        
        try:
            proof = self.contract.functions.getProof(proof_id.encode()).call()
            return {
                "ipfs_hash": proof[0],
                "validator": proof[1],
                "timestamp": proof[2],
                "reputation_score": proof[3]
            }
        except Exception as e:
            logger.error(f"Error verifying data proof: {e}")
            return None
    
    def trigger_emergency_alert(self, alert_data: Dict[str, Any]) -> Optional[str]:
        """Trigger emergency alert on blockchain."""
        if not self.contract:
            logger.error("Contract not initialized")
            return None
        
        try:
            # Build transaction
            transaction = self.contract.functions.triggerEmergencyAlert(
                alert_data["severity"],
                alert_data["location"],
                alert_data["message"]
            ).buildTransaction({
                'from': self.account.address,
                'gas': 150000,
                'gasPrice': self.get_gas_price(),
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, settings.PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                logger.info(f"Emergency alert triggered: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                logger.error(f"Emergency alert transaction failed: {tx_hash.hex()}")
                return None
                
        except Exception as e:
            logger.error(f"Error triggering emergency alert: {e}")
            return None


# Global blockchain manager instance
blockchain_manager = BlockchainManager()
