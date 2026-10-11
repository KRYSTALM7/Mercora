"""Customer endpoints"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.customer_service import CustomerService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/customers", tags=["customers"], dependencies=[Depends(get_current_user)])


class CustomerCreate(BaseModel):
    email: str
    name: str
    segment: str = "Standard"
    lifetime_value: float = 0.0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    segment: Optional[str] = None
    lifetime_value: Optional[float] = None


def _serialize(c) -> dict:
    return {
        "id": c.id, "email": c.email, "name": c.name,
        "segment": c.segment, "lifetime_value": c.lifetime_value,
    }


@router.get("")
async def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return [_serialize(c) for c in CustomerService.get_all(db, skip, limit)]


@router.get("/segments")
async def customer_segments(db: Session = Depends(get_db)):
    return CustomerService.segments(db)


@router.get("/lifetime")
async def lifetime_value_ranking(limit: int = 10, db: Session = Depends(get_db)):
    return [_serialize(c) for c in CustomerService.top_by_lifetime_value(db, limit)]


@router.get("/{customer_id}")
async def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = CustomerService.get_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _serialize(customer)


@router.get("/{customer_id}/orders")
async def get_customer_orders(customer_id: int, db: Session = Depends(get_db)):
    if not CustomerService.get_by_id(db, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    orders = CustomerService.get_orders(db, customer_id)
    return [
        {"id": o.id, "order_number": o.order_number, "order_date": o.order_date.isoformat() if o.order_date else None,
         "total_amount": o.total_amount, "status": o.status}
        for o in orders
    ]


@router.post("")
async def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    customer = CustomerService.create(db, payload.model_dump())
    return _serialize(customer)


@router.put("/{customer_id}")
async def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    customer = CustomerService.update(db, customer_id, payload.model_dump(exclude_unset=True))
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _serialize(customer)


@router.delete("/{customer_id}")
async def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    if not CustomerService.delete(db, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "deleted", "id": customer_id}
