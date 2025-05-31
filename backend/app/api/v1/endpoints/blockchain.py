"""Blockchain verification API endpoints."""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.blockchain_service import BlockchainService
from app.core.security import get_current_active_user
from app.models.user import User, UserRole

router = APIRouter()
logger = logging.getLogger(__name__)

blockchain_service = BlockchainService()


@router.post("/verify-data")
async def submit_data_verification(
    data_hash: str,
    ipfs_cid: str,
    data_type: str = Query(..., description="Type of data (climate, alert, etc.)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit data for blockchain verification."""
    try:
        # Check user permissions for data submission
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for blockchain data submission"
            )
        
        # Submit to blockchain
        result = await blockchain_service.submit_data_proof(
            data_hash=data_hash,
            ipfs_cid=ipfs_cid,
            data_type=data_type,
            submitter=current_user.wallet_address or current_user.username,
            db=db
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit data to blockchain"
            )
        
        logger.info(f"Data verification submitted: {data_hash}")
        return {
            "message": "Data submitted for blockchain verification",
            "transaction_hash": result.get("transaction_hash"),
            "proof_id": result.get("proof_id"),
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting data verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit data verification"
        )


@router.get("/verify/{proof_id}")
async def verify_data_proof(
    proof_id: str,
    db: Session = Depends(get_db)
):
    """Verify data proof on blockchain."""
    try:
        # Get proof from blockchain
        proof = await blockchain_service.verify_data_proof(proof_id, db)
        
        if not proof:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proof not found on blockchain"
            )
        
        return {
            "proof_id": proof_id,
            "verified": True,
            "proof_data": proof,
            "verification_timestamp": proof.get("timestamp"),
            "validator": proof.get("validator"),
            "reputation_score": proof.get("reputation_score")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying data proof: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify data proof"
        )


@router.get("/transaction/{tx_hash}")
async def get_transaction_status(
    tx_hash: str,
    db: Session = Depends(get_db)
):
    """Get blockchain transaction status."""
    try:
        # Get transaction details from blockchain
        transaction = await blockchain_service.get_transaction_status(tx_hash, db)
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return {
            "transaction_hash": tx_hash,
            "status": transaction.get("status"),
            "block_number": transaction.get("block_number"),
            "gas_used": transaction.get("gas_used"),
            "timestamp": transaction.get("timestamp")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transaction status"
        )


@router.get("/network-status")
async def get_blockchain_network_status():
    """Get blockchain network status."""
    try:
        status_info = await blockchain_service.get_network_status()
        
        return {
            "connected": status_info.get("connected", False),
            "latest_block": status_info.get("latest_block"),
            "network_id": status_info.get("network_id"),
            "gas_price": status_info.get("gas_price"),
            "peer_count": status_info.get("peer_count")
        }
        
    except Exception as e:
        logger.error(f"Error getting network status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get network status"
        )


@router.post("/emergency-alert")
async def submit_emergency_alert_to_blockchain(
    alert_id: str,
    alert_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit emergency alert to blockchain."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for emergency alert submission"
            )
        
        # Submit alert to blockchain
        result = await blockchain_service.submit_emergency_alert(
            alert_id=alert_id,
            alert_data=alert_data,
            db=db
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit emergency alert to blockchain"
            )
        
        logger.info(f"Emergency alert submitted to blockchain: {alert_id}")
        return {
            "message": "Emergency alert submitted to blockchain",
            "transaction_hash": result.get("transaction_hash"),
            "alert_id": alert_id,
            "status": "confirmed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting emergency alert to blockchain: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit emergency alert to blockchain"
        )


@router.get("/reputation/{validator_address}")
async def get_validator_reputation(
    validator_address: str,
    db: Session = Depends(get_db)
):
    """Get validator reputation score."""
    try:
        reputation = await blockchain_service.get_validator_reputation(
            validator_address, db
        )
        
        if reputation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Validator not found"
            )
        
        return {
            "validator_address": validator_address,
            "reputation_score": reputation.get("score"),
            "total_validations": reputation.get("total_validations"),
            "successful_validations": reputation.get("successful_validations"),
            "last_activity": reputation.get("last_activity")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting validator reputation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get validator reputation"
        )


@router.post("/validate-data")
async def validate_community_data(
    proof_id: str,
    validation_result: bool,
    comments: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit community validation for data proof."""
    try:
        # Submit validation to blockchain
        result = await blockchain_service.submit_community_validation(
            proof_id=proof_id,
            validator_address=current_user.wallet_address or current_user.username,
            validation_result=validation_result,
            comments=comments,
            db=db
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit validation"
            )
        
        logger.info(f"Community validation submitted: {proof_id}")
        return {
            "message": "Validation submitted successfully",
            "transaction_hash": result.get("transaction_hash"),
            "proof_id": proof_id,
            "validation_result": validation_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting community validation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit validation"
        )
