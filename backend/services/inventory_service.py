"""Inventory business logic"""
import logging
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.database.models import Inventory

logger = logging.getLogger(__name__)


class InventoryService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Inventory]:
        return db.query(Inventory).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, inventory_id: int) -> Optional[Inventory]:
        return db.query(Inventory).filter(Inventory.id == inventory_id).first()

    @staticmethod
    def get_by_product(db: Session, product_id: int) -> Optional[Inventory]:
        return db.query(Inventory).filter(Inventory.product_id == product_id).first()

    @staticmethod
    def update_stock(db: Session, inventory_id: int, data: Dict) -> Optional[Inventory]:
        inv = InventoryService.get_by_id(db, inventory_id)
        if not inv:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(inv, key, value)
        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def transfer(db: Session, inventory_id: int, quantity: int, destination_location: str) -> Optional[Inventory]:
        """Move `quantity` units to a new warehouse_location (single-location model)."""
        inv = InventoryService.get_by_id(db, inventory_id)
        if not inv or inv.quantity_on_hand < quantity:
            return None
        inv.warehouse_location = destination_location
        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def reorder(db: Session, inventory_id: int) -> Optional[Inventory]:
        inv = InventoryService.get_by_id(db, inventory_id)
        if not inv:
            return None
        inv.quantity_on_hand += inv.reorder_quantity
        inv.last_restock_date = datetime.utcnow()
        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def low_stock(db: Session) -> List[Inventory]:
        return db.query(Inventory).filter(Inventory.quantity_on_hand < Inventory.reorder_point).all()
