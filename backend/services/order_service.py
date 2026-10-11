"""Order business logic"""
import logging
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.database.models import Order, OrderItem

logger = logging.getLogger(__name__)


class OrderService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Order]:
        return db.query(Order).order_by(Order.order_date.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def create(db: Session, data: Dict) -> Order:
        order = Order(**data)
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update(db: Session, order_id: int, data: Dict) -> Optional[Order]:
        order = OrderService.get_by_id(db, order_id)
        if not order:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(order, key, value)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def set_status(db: Session, order_id: int, status: str) -> Optional[Order]:
        return OrderService.update(db, order_id, {"status": status})

    @staticmethod
    def get_items(db: Session, order_id: int) -> List[OrderItem]:
        return db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
