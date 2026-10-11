"""Analytics computations over existing business data"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List

from sqlalchemy.orm import Session

from backend.database.models import Customer, Order, OrderItem, Product, Recommendation

logger = logging.getLogger(__name__)


class AnalyticsService:
    @staticmethod
    def revenue(db: Session, days: int = 30) -> Dict:
        since = datetime.utcnow() - timedelta(days=days)
        orders = db.query(Order).filter(Order.order_date >= since).all()
        total = sum(o.total_amount for o in orders if o.total_amount)
        return {
            "period_days": days,
            "total_revenue": round(total, 2),
            "order_count": len(orders),
            "average_order_value": round(total / len(orders), 2) if orders else 0,
        }

    @staticmethod
    def product_performance(db: Session, limit: int = 10) -> List[Dict]:
        items = db.query(OrderItem).all()
        sales: Dict[int, Dict] = {}
        for item in items:
            entry = sales.setdefault(item.product_id, {"quantity": 0, "revenue": 0})
            entry["quantity"] += item.quantity
            entry["revenue"] += item.unit_price * item.quantity

        ranked = sorted(sales.items(), key=lambda kv: kv[1]["revenue"], reverse=True)[:limit]
        results = []
        for product_id, stats in ranked:
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                results.append({
                    "sku": product.sku,
                    "name": product.name,
                    "units_sold": stats["quantity"],
                    "revenue": round(stats["revenue"], 2),
                })
        return results

    @staticmethod
    def customer_analytics(db: Session) -> Dict:
        customers = db.query(Customer).all()
        if not customers:
            return {"total_customers": 0, "segments": [], "average_lifetime_value": 0}

        segment_counts: Dict[str, int] = {}
        for c in customers:
            segment_counts[c.segment] = segment_counts.get(c.segment, 0) + 1

        total_ltv = sum(c.lifetime_value or 0 for c in customers)
        return {
            "total_customers": len(customers),
            "segments": [{"segment": s, "count": n} for s, n in segment_counts.items()],
            "average_lifetime_value": round(total_ltv / len(customers), 2),
        }

    @staticmethod
    def forecast_accuracy(db: Session) -> Dict:
        """Proxy metric: there's no logged actuals to compare forecasts against,
        so this reports recommendation confidence vs. approval outcome instead
        of true forecast error (MAPE)."""
        recs = db.query(Recommendation).all()
        if not recs:
            return {"total_recommendations": 0, "average_confidence": 0, "approval_rate": 0}

        decided = [r for r in recs if r.approval_status in ("approved", "rejected")]
        approved = [r for r in decided if r.approval_status == "approved"]
        avg_confidence = sum(r.confidence_score or 0 for r in recs) / len(recs)

        return {
            "total_recommendations": len(recs),
            "average_confidence": round(avg_confidence, 2),
            "approval_rate": round(len(approved) / len(decided), 2) if decided else 0,
            "pending_count": len(recs) - len(decided),
        }
