"""Analytics endpoints"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"], dependencies=[Depends(get_current_user)])


@router.get("/revenue")
async def revenue_analytics(days: int = 30, db: Session = Depends(get_db)):
    return AnalyticsService.revenue(db, days)


@router.get("/products")
async def product_analytics(limit: int = 10, db: Session = Depends(get_db)):
    return AnalyticsService.product_performance(db, limit)


@router.get("/customers")
async def customer_analytics(db: Session = Depends(get_db)):
    return AnalyticsService.customer_analytics(db)


@router.get("/forecast")
async def forecast_analytics(db: Session = Depends(get_db)):
    return AnalyticsService.forecast_accuracy(db)
