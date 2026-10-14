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


# Demo Order Mapping: Mercora order ID → Cascade domain order ID
# This maps a limited set of Mercora orders to Cascade's NovaCart seed data for demonstration.
# The mapping preserves Cascade's rich domain scenarios (VIP customers, risk tiers, etc.)
# without requiring cross-system data synchronization.
#
# Cascade seed orders (ORD-10xxx) are defined in cascade/backend/app/seed/novacart_data.py
# and represent the NovaCart retail business with products like laptops, headphones, watches.
#
# Mapping strategy: Selected Mercora orders are mapped to Cascade orders with similar
# characteristics (value, status, refundability) to provide realistic simulation scenarios.
#
# Mercora demo orders are created by backend/scripts/seed_demo_data.py (ORD-DEMO-xxx)
DEMO_ORDER_MAPPING = {
    # Map seeded Mercora demo orders to Cascade's NovaCart orders
    # Mercora: ORD-DEMO-001-020 (IDs 21-40)
    # Cascade: ORD-10xxx (NovaCart retail orders)
    21: "ORD-10482",  # ORD-DEMO-001: High-value VIP order (₹97,500: laptop + headphones) - HERO scenario
    22: "ORD-10510",  # ORD-DEMO-002: Low-value order (₹2,798) - under auto-approve limit
    23: "ORD-10495",  # ORD-DEMO-003: Medium-value order (₹19,798: watch + cables) - standard refund
    25: "ORD-10501",  # ORD-DEMO-005: Shipped order (₹55,000: phone) - notification scenario
    27: "ORD-10520",  # ORD-DEMO-007: Partially refunded scenario (₹15,000: chair)
    30: "ORD-10540",  # ORD-DEMO-010: High-value order #2 (₹103,000: laptop + watch) - concurrency demo
    35: "ORD-10477",  # ORD-DEMO-015: Delivered order (₹3,097) - test ineligible status handling
    40: "ORD-10530",  # ORD-DEMO-020: Standard order (₹55,000: phone) - clarification demo
}


def get_cascade_order_id(mercora_order_id: int) -> str:
    """
    Map Mercora order ID to Cascade demo domain order ID.
    
    Raises HTTPException (400) if the order is not in the demo scope.
    This prevents attempting simulations on unmapped orders that don't
    exist in Cascade's domain.
    """
    cascade_id = DEMO_ORDER_MAPPING.get(mercora_order_id)
    if cascade_id is None:
        available_ids = sorted(DEMO_ORDER_MAPPING.keys())
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Order not in demo scope",
                "message": f"Cascade simulation is available for demo orders only. "
                          f"This integration maps {len(DEMO_ORDER_MAPPING)} representative Mercora orders "
                          f"to Cascade's NovaCart seed data.",
                "demo_order_ids": available_ids,
                "requested_order_id": mercora_order_id
            }
        )
    return cascade_id


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
    1. Validates the order exists in Mercora
    2. Validates the order is in the demo mapping scope
    3. Constructs a Cascade simulation request using the correct agent/tool
    4. Calls Cascade's simulation API with the mapped order ID
    5. Returns the consequence analysis
    6. DOES NOT execute the refund or modify order state
    
    Demo Scope:
    - Only mapped orders (see DEMO_ORDER_MAPPING) can be simulated
    - Unmapped orders return 400 with available order IDs
    - This enforces honest demo boundaries without silently failing
    
    Security:
    - Requires JWT authentication (inherited from router dependencies)
    - Uses configured Cascade demo user identity (settings.CASCADE_DEMO_USER)
    - Never allows frontend to specify privileged identity
    - Validates order exists before making external API call
    """
    # Validate order exists in Mercora
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate order is in demo scope (raises 400 if not mapped)
    cascade_order_id = get_cascade_order_id(order.id)
    
    # Check order is refundable
    if order.status in ["cancelled", "refunded"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Order status is {order.status}, cannot refund"
        )
    
    # Capture order state before simulation (for verification)
    order_status_before = order.status
    order_id_internal = order.id
    
    # Construct Cascade simulation request
    # Agent: customer-support (owns request_refund tool)
    # Tool: request_refund (asks Finance to issue refund via reaction rule)
    # This follows Cascade's authorization model where support requests refunds
    # but cannot directly execute them.
    #
    # NOTE: We pass only order_id and reason. Cascade will determine the refund
    # amount from its own order database. The mapping ensures Cascade evaluates
    # consequences for an order with similar characteristics to the Mercora order.
    cascade_action = {
        "agent_id": "customer-support",
        "tool": "request_refund",
        "parameters": {
            "order_id": cascade_order_id,  # Use mapped Cascade order ID
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
