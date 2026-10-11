"""Customer business logic"""
import logging
from typing import Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database.models import Customer, Order

logger = logging.getLogger(__name__)


class CustomerService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Customer]:
        return db.query(Customer).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, customer_id: int) -> Optional[Customer]:
        return db.query(Customer).filter(Customer.id == customer_id).first()

    @staticmethod
    def create(db: Session, data: Dict) -> Customer:
        customer = Customer(**data)
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def update(db: Session, customer_id: int, data: Dict) -> Optional[Customer]:
        customer = CustomerService.get_by_id(db, customer_id)
        if not customer:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(customer, key, value)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def delete(db: Session, customer_id: int) -> bool:
        customer = CustomerService.get_by_id(db, customer_id)
        if not customer:
            return False
        db.delete(customer)
        db.commit()
        return True

    @staticmethod
    def get_orders(db: Session, customer_id: int) -> List[Order]:
        return db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.order_date.desc()).all()

    @staticmethod
    def segments(db: Session) -> List[Dict]:
        rows = db.query(Customer.segment, func.count(Customer.id), func.avg(Customer.lifetime_value)).group_by(Customer.segment).all()
        return [
            {"segment": segment, "customer_count": count, "avg_lifetime_value": round(avg_ltv or 0, 2)}
            for segment, count, avg_ltv in rows
        ]

    @staticmethod
    def top_by_lifetime_value(db: Session, limit: int = 10) -> List[Customer]:
        return db.query(Customer).order_by(Customer.lifetime_value.desc()).limit(limit).all()
