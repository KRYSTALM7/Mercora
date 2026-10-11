"""Product business logic"""
import logging
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.database.models import Inventory, Product

logger = logging.getLogger(__name__)


class ProductService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Product]:
        return db.query(Product).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_by_sku(db: Session, sku: str) -> Optional[Product]:
        return db.query(Product).filter(Product.sku == sku).first()

    @staticmethod
    def search(db: Session, q: str, limit: int = 50) -> List[Product]:
        pattern = f"%{q}%"
        return db.query(Product).filter(
            (Product.name.ilike(pattern)) | (Product.sku.ilike(pattern))
        ).limit(limit).all()

    @staticmethod
    def by_category(db: Session, category: str, limit: int = 100) -> List[Product]:
        return db.query(Product).filter(Product.category == category).limit(limit).all()

    @staticmethod
    def create(db: Session, data: Dict) -> Product:
        product = Product(**data)
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update(db: Session, product_id: int, data: Dict) -> Optional[Product]:
        product = ProductService.get_by_id(db, product_id)
        if not product:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(product, key, value)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete(db: Session, product_id: int) -> bool:
        product = ProductService.get_by_id(db, product_id)
        if not product:
            return False
        db.delete(product)
        db.commit()
        return True

    @staticmethod
    def bulk_import(db: Session, products_data: List[Dict]) -> List[Product]:
        products = [Product(**data) for data in products_data]
        db.add_all(products)
        db.commit()
        for p in products:
            db.refresh(p)
        return products

    @staticmethod
    def get_low_stock(db: Session) -> List[Dict]:
        results = db.query(Product, Inventory).join(
            Inventory, Product.id == Inventory.product_id
        ).filter(Inventory.quantity_on_hand < Inventory.reorder_point).all()
        return [
            {"product": p, "current_stock": inv.quantity_on_hand, "reorder_point": inv.reorder_point}
            for p, inv in results
        ]
