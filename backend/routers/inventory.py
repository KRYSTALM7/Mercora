"""Inventory endpoints"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.inventory_service import InventoryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])


class InventoryUpdate(BaseModel):
    quantity_on_hand: Optional[int] = None
    reorder_point: Optional[int] = None
    reorder_quantity: Optional[int] = None
    warehouse_location: Optional[str] = None


class TransferRequest(BaseModel):
    quantity: int
    destination_location: str


def _serialize(i) -> dict:
    return {
        "id": i.id, "product_id": i.product_id, "quantity_on_hand": i.quantity_on_hand,
        "reorder_point": i.reorder_point, "reorder_quantity": i.reorder_quantity,
        "warehouse_location": i.warehouse_location,
        "last_restock_date": i.last_restock_date.isoformat() if i.last_restock_date else None,
    }


@router.get("")
async def list_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return [_serialize(i) for i in InventoryService.get_all(db, skip, limit)]


@router.get("/low-stock")
async def low_stock(db: Session = Depends(get_db)):
    return [_serialize(i) for i in InventoryService.low_stock(db)]


@router.get("/{inventory_id}")
async def get_inventory(inventory_id: int, db: Session = Depends(get_db)):
    inv = InventoryService.get_by_id(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return _serialize(inv)


@router.put("/{inventory_id}")
async def update_inventory(inventory_id: int, payload: InventoryUpdate, db: Session = Depends(get_db)):
    inv = InventoryService.update_stock(db, inventory_id, payload.model_dump(exclude_unset=True))
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return _serialize(inv)


@router.post("/transfer")
async def transfer_inventory(inventory_id: int, payload: TransferRequest, db: Session = Depends(get_db)):
    inv = InventoryService.transfer(db, inventory_id, payload.quantity, payload.destination_location)
    if not inv:
        raise HTTPException(status_code=400, detail="Transfer failed: record not found or insufficient stock")
    return _serialize(inv)


@router.post("/reorder")
async def reorder_inventory(inventory_id: int, db: Session = Depends(get_db)):
    inv = InventoryService.reorder(db, inventory_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return _serialize(inv)
