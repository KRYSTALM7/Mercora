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
        # Get orders
        orders = db.query(Order).all()
        order_items = db.query(OrderItem).all()
        products = db.query(Product).all()
        inventory = db.query(Inventory).all()
        
        if not orders or not products:
            return {
                "period_days": days,
                "sales": {"total_sales": 0, "order_count": 0},
                "inventory": {"total_products": len(products), "low_stock_items": 0},
                "top_products": []
            }
        
        # Calculate metrics
        total_sales = sum(o.total_amount for o in orders if o.total_amount)
        order_count = len(orders)
        
        # Calculate product sales
        product_sales = {}
        for item in order_items:
            if item.product_id not in product_sales:
                product_sales[item.product_id] = {"quantity": 0, "revenue": 0}
            product_sales[item.product_id]["quantity"] += item.quantity
            product_sales[item.product_id]["revenue"] += item.unit_price * item.quantity
        
        # Get top 5 products
        top_product_ids = sorted(
            product_sales.items(), 
            key=lambda x: x[1]["quantity"], 
            reverse=True
        )[:5]
        
        top_products = []
        for prod_id, _ in top_product_ids:
            prod = db.query(Product).filter(Product.id == prod_id).first()
            if prod:
                top_products.append({
                    "id": prod.id,
                    "sku": prod.sku,
                    "name": prod.name,
                    "price": prod.price
                })
        
        # Low stock items
        low_stock = [inv for inv in inventory if inv.quantity_on_hand < inv.reorder_point]
        
        return {
            "period_days": days,
            "sales": {
                "total_sales": total_sales,
                "order_count": order_count
            },
            "inventory": {
                "total_products": len(products),
                "low_stock_items": len(low_stock)
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
