"""Cascade integration endpoints - simulation only for now"""
import logging
import httpx
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import Order
from backend.routers.auth import get_current_user
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cascade", tags=["cascade"], dependencies=[Depends(get_current_user)])


class SimulateRefundRequest(BaseModel):
    order_id: int
    reason: Optional[str] = "customer_request"


class SimulateRefundResponse(BaseModel):
    status: str  # "simulated" | "error" | "unavailable" | "unauthorized"
    cascade_action_id: Optional[str] = None
    cascade_action: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None  # For structured error handling


@router.get("/health")
async def cascade_health():
    """
    Check if Cascade API is available.
    
    Note: Cascade production API does not expose a health endpoint.
    We test availability by checking if the base URL is reachable.
    Actual functionality is verified through simulation attempts.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try root endpoint - if it returns 404 with proper JSON, service is up
            response = await client.get(settings.CASCADE_API_URL)
            # Any response (including 404) means service is reachable
            return {
                "status": "available",
                "cascade_available": True,
                "cascade_api_url": settings.CASCADE_API_URL,
                "note": "Health check via connectivity test (no dedicated health endpoint)"
            }
    except httpx.TimeoutException:
        logger.warning("Cascade health check timed out")
        return {
            "status": "timeout",
            "cascade_available": False,
            "error": "Cascade API connection timeout"
        }
    except Exception as e:
        logger.warning(f"Cascade health check failed: {e}")
        return {
            "status": "unavailable",
            "cascade_available": False,
            "error": str(e)
        }


@router.post("/simulate-refund", response_model=SimulateRefundResponse)
async def simulate_refund(
    request: SimulateRefundRequest, 
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Simulate a refund through Cascade.
    
    This endpoint:
    1. Validates the order exists
    2. Constructs a structured action for Cascade
    3. Calls Cascade's simulation API
    4. Returns the consequence analysis
    5. DOES NOT execute the refund or modify order state
    
    Security:
    - Requires JWT authentication (inherited from router dependencies)
    - Uses configured Cascade demo user identity (settings.CASCADE_DEMO_USER)
    - Never allows frontend to specify privileged identity
    - Validates order exists before making external API call
    """
    # Validate order exists
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check order is refundable
    if order.status in ["cancelled", "refunded"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Order status is {order.status}, cannot refund"
        )
    
    # Capture order state before simulation (for verification)
    order_status_before = order.status
    order_id_internal = order.id
    
    # Construct Cascade action
    cascade_action = {
        "agent_id": "commerce-ops",
        "tool": "process_refund",
        "parameters": {
            "order_id": order.order_number,
            "amount": str(order.total_amount),
            "reason": request.reason
        }
    }
    
    try:
        # Call Cascade simulation API
        async with httpx.AsyncClient(timeout=settings.CASCADE_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{settings.CASCADE_API_URL}/api/actions/simulate",
                json=cascade_action,
                headers={
                    "Content-Type": "application/json",
                    "X-User-Id": settings.CASCADE_DEMO_USER  # Use configured demo identity
                }
            )
            
            # Handle non-200 responses with detailed error information
            if response.status_code == 401:
                logger.error(f"Cascade authentication failed with user: {settings.CASCADE_DEMO_USER}")
                try:
                    error_detail = response.json()
                    error_message = error_detail.get('error', {}).get('message', 'Authentication failed')
                except:
                    error_message = "Authentication failed"
                
                return SimulateRefundResponse(
                    status="unauthorized",
                    error=f"Cascade authentication failed: {error_message}",
                    error_code="CASCADE_AUTH_FAILED"
                )
            
            if response.status_code == 400:
                logger.error(f"Cascade validation error: {response.status_code}")
                try:
                    error_detail = response.json()
                    error_message = error_detail.get('error', {}).get('message', 'Invalid request')
                except:
                    error_message = "Invalid request"
                
                return SimulateRefundResponse(
                    status="error",
                    error=f"Cascade validation error: {error_message}",
                    error_code="CASCADE_VALIDATION_ERROR"
                )
            
            if response.status_code >= 500:
                logger.error(f"Cascade server error: {response.status_code}")
                return SimulateRefundResponse(
                    status="unavailable",
                    error="Cascade service is temporarily unavailable. Please try again later.",
                    error_code="CASCADE_SERVICE_ERROR"
                )
            
            if response.status_code != 200:
                logger.error(f"Cascade unexpected response: {response.status_code}")
                try:
                    error_detail = response.json()
                    error_message = error_detail.get('error', {}).get('message', 'Unknown error')
                except:
                    error_message = f"HTTP {response.status_code}"
                
                return SimulateRefundResponse(
                    status="error",
                    error=f"Cascade simulation failed: {error_message}",
                    error_code="CASCADE_UNKNOWN_ERROR"
                )
            
            # Parse successful response
            try:
                cascade_result = response.json()
            except Exception as e:
                logger.error(f"Failed to parse Cascade response: {e}")
                return SimulateRefundResponse(
                    status="error",
                    error="Failed to parse Cascade response",
                    error_code="CASCADE_PARSE_ERROR"
                )
            
            # Validate response structure
            if "action" not in cascade_result:
                logger.error("Cascade response missing 'action' field")
                return SimulateRefundResponse(
                    status="error",
                    error="Invalid Cascade response structure",
                    error_code="CASCADE_INVALID_RESPONSE"
                )
            
            if "id" not in cascade_result["action"]:
                logger.error("Cascade action missing 'id' field")
                return SimulateRefundResponse(
                    status="error",
                    error="Invalid Cascade action structure",
                    error_code="CASCADE_INVALID_ACTION"
                )
            
            # Verify order state unchanged (critical safety check)
            db.refresh(order)
            if order.status != order_status_before:
                logger.critical(
                    f"ORDER STATE CHANGED DURING SIMULATION! "
                    f"Order {order_id_internal}: {order_status_before} -> {order.status}"
                )
                # This should never happen - log and alert
                return SimulateRefundResponse(
                    status="error",
                    error="Critical error: Order state was modified during simulation",
                    error_code="SIMULATION_STATE_VIOLATION"
                )
            
            # Return successful simulation result
            return SimulateRefundResponse(
                status="simulated",
                cascade_action_id=cascade_result["action"]["id"],
                cascade_action=cascade_result,
                message="Consequence simulation completed successfully"
            )
    
    except httpx.TimeoutException:
        logger.error(f"Cascade simulation timeout after {settings.CASCADE_TIMEOUT_SECONDS}s")
        return SimulateRefundResponse(
            status="error",
            error=f"Cascade simulation timed out after {settings.CASCADE_TIMEOUT_SECONDS} seconds. Please try again.",
            error_code="CASCADE_TIMEOUT"
        )
    
    except httpx.ConnectError as e:
        logger.error(f"Cascade connection error: {e}")
        return SimulateRefundResponse(
            status="unavailable",
            error="Cannot connect to Cascade service. Please check network connectivity.",
            error_code="CASCADE_CONNECT_ERROR"
        )
    
    except httpx.HTTPError as e:
        logger.error(f"Cascade HTTP error: {e}")
        return SimulateRefundResponse(
            status="error",
            error=f"HTTP error communicating with Cascade: {str(e)}",
            error_code="CASCADE_HTTP_ERROR"
        )
    
    except Exception as e:
        logger.error(f"Unexpected error in Cascade simulation: {e}", exc_info=True)
        return SimulateRefundResponse(
            status="error",
            error="An unexpected error occurred during simulation",
            error_code="CASCADE_UNEXPECTED_ERROR"
        )
