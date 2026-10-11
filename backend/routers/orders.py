"""Order endpoints"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.order_service import OrderService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/orders", tags=["orders"], dependencies=[Depends(get_current_user)])


class OrderCreate(BaseModel):
    order_number: str
    customer_id: int
    order_date: Optional[datetime] = None
    total_amount: float
    status: str = "pending"


class OrderUpdate(BaseModel):
    total_amount: Optional[float] = None
    status: Optional[str] = None


def _serialize(o) -> dict:
    return {
        "id": o.id, "order_number": o.order_number, "customer_id": o.customer_id,
        "order_date": o.order_date.isoformat() if o.order_date else None,
        "total_amount": o.total_amount, "status": o.status,
    }


@router.get("")
async def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return [_serialize(o) for o in OrderService.get_all(db, skip, limit)]


@router.get("/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db)):
    order = OrderService.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize(order)


@router.get("/{order_id}/items")
async def get_order_items(order_id: int, db: Session = Depends(get_db)):
    if not OrderService.get_by_id(db, order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    items = OrderService.get_items(db, order_id)
    return [
        {"id": i.id, "product_id": i.product_id, "quantity": i.quantity, "unit_price": i.unit_price}
        for i in items
    ]


@router.post("")
async def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["order_date"] = data["order_date"] or datetime.utcnow()
    order = OrderService.create(db, data)
    return _serialize(order)


@router.put("/{order_id}")
async def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    order = OrderService.update(db, order_id, payload.model_dump(exclude_unset=True))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize(order)


@router.delete("/{order_id}")
async def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = OrderService.set_status(db, order_id, "cancelled")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize(order)


@router.post("/{order_id}/ship")
async def ship_order(order_id: int, db: Session = Depends(get_db)):
    order = OrderService.set_status(db, order_id, "shipped")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize(order)


@router.post("/{order_id}/refund")
async def refund_order(order_id: int, db: Session = Depends(get_db)):
    """
    DEPRECATED: Direct refunds are disabled to enforce consequence analysis.
    
    All refund operations must go through the Cascade consequence simulation
    and approval workflow to ensure safe execution and proper risk assessment.
    
    Use POST /api/cascade/simulate-refund instead.
    """
    raise HTTPException(
        status_code=410,
        detail={
            "error": "Direct refunds are disabled",
            "message": "All refund operations must go through Cascade consequence simulation. Use POST /api/cascade/simulate-refund to simulate the refund and view consequences before execution.",
            "cascade_endpoint": "/api/cascade/simulate-refund"
        }
    )
