"""Product endpoints"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.product_service import ProductService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/products", tags=["products"], dependencies=[Depends(get_current_user)])


class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    price: float
    cost: float
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    description: Optional[str] = None


def _serialize(p) -> dict:
    return {
        "id": p.id, "sku": p.sku, "name": p.name, "category": p.category,
        "price": p.price, "cost": p.cost, "description": p.description,
    }


@router.get("")
async def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return [_serialize(p) for p in ProductService.get_all(db, skip, limit)]


@router.get("/search")
async def search_products(q: str, db: Session = Depends(get_db)):
    return [_serialize(p) for p in ProductService.search(db, q)]


@router.get("/category")
async def products_by_category(name: str, db: Session = Depends(get_db)):
    return [_serialize(p) for p in ProductService.by_category(db, name)]


@router.get("/low-stock")
async def low_stock_products(db: Session = Depends(get_db)):
    results = ProductService.get_low_stock(db)
    return [
        {**_serialize(r["product"]), "current_stock": r["current_stock"], "reorder_point": r["reorder_point"]}
        for r in results
    ]


@router.get("/{product_id}")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _serialize(product)


@router.post("")
async def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if ProductService.get_by_sku(db, payload.sku):
        raise HTTPException(status_code=409, detail="Product with this SKU already exists")
    product = ProductService.create(db, payload.model_dump())
    return _serialize(product)


@router.put("/{product_id}")
async def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = ProductService.update(db, product_id, payload.model_dump(exclude_unset=True))
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _serialize(product)


@router.delete("/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    if not ProductService.delete(db, product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "deleted", "id": product_id}


@router.post("/import")
async def import_products(payload: List[ProductCreate], db: Session = Depends(get_db)):
    products = ProductService.bulk_import(db, [p.model_dump() for p in payload])
    return {"imported": len(products)}
