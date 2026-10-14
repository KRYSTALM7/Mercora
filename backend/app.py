"""FastAPI Backend Application"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import uuid
import os

from backend.config import settings, get_settings
from backend.database.connection import get_db, init_db
from backend.database.models import (
    Order, OrderItem, Product, Inventory
)
from backend.routers.auth import router as auth_router, get_current_user
from backend.routers.products import router as products_router
from backend.routers.customers import router as customers_router
from backend.routers.orders import router as orders_router
from backend.routers.inventory import router as inventory_router
from backend.routers.analytics import router as analytics_router
from backend.routers import cascade_integration
from backend.routers import voice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="E-commerce AI Operations Agent",
    version="1.0.0",
    description="AI-powered e-commerce operations management"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(customers_router)
app.include_router(orders_router)
app.include_router(inventory_router)
app.include_router(analytics_router)
app.include_router(cascade_integration.router)
app.include_router(voice.router)

# ============================================================================
# Health & Info Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "E-commerce AI Operations Agent"
    }

@app.get("/info")
async def info():
    """API information"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "description": "AI-powered e-commerce operations management"
    }

# ============================================================================
# Metrics Endpoints
# ============================================================================

@app.get("/api/metrics")
async def get_metrics(days: int = 30, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Get business metrics"""
    try:
        # Count queries are fast with proper indexes
        order_count = db.query(Order).count()
        product_count = db.query(Product).count()
        
        if order_count == 0:
            return {
                "period_days": days,
                "sales": {"total_sales": 0, "order_count": 0},
                "inventory": {"total_products": product_count, "low_stock_items": 0},
                "top_products": []
            }
        
        # Calculate total sales efficiently using SQL aggregation
        from sqlalchemy import func
        total_sales_result = db.query(func.sum(Order.total_amount)).scalar()
        total_sales = float(total_sales_result) if total_sales_result else 0
        
        # Get top 5 products by quantity sold using efficient SQL join
        top_products_query = (
            db.query(
                Product.id,
                Product.sku,
                Product.name,
                Product.price,
                func.sum(OrderItem.quantity).label('total_quantity')
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .group_by(Product.id, Product.sku, Product.name, Product.price)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5)
        )
        
        top_products = []
        for row in top_products_query.all():
            top_products.append({
                "id": row.id,
                "sku": row.sku,
                "name": row.name,
                "price": row.price
            })
        
        # Count low stock items efficiently
        low_stock_count = db.query(Inventory).filter(
            Inventory.quantity_on_hand < Inventory.reorder_point
        ).count()
        
        return {
            "period_days": days,
            "sales": {
                "total_sales": total_sales,
                "order_count": order_count
            },
            "inventory": {
                "total_products": product_count,
                "low_stock_items": low_stock_count
            },
            "top_products": top_products
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Startup & Shutdown
# ============================================================================

# Startup event
@app.on_event("startup")
async def startup():
    logger.info("Application startup")
    init_db()

# Shutdown event
@app.on_event("shutdown")
async def shutdown():
    logger.info("Application shutdown")
