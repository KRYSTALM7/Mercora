"""Load sample e-commerce data"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv("backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/ecommerce_ai")

def load_sample_data():
    """Load sample e-commerce data"""
    try:
        engine = create_engine(DATABASE_URL)
        
        print("Loading sample data...")
        
        # Generate sample data
        np.random.seed(42)
        
        # Products
        print("Loading products...")
        products = pd.DataFrame({
            'sku': [f'SKU{i:05d}' for i in range(1, 101)],
            'name': [f'Product {i}' for i in range(1, 101)],
            'category': np.random.choice(['Electronics', 'Clothing', 'Home', 'Sports'], 100),
            'price': np.random.uniform(10, 500, 100),
            'cost': np.random.uniform(5, 250, 100),
            'description': [f'Product {i}' for i in range(1, 101)],
        })
        products.to_sql('products', engine, if_exists='append', index=False)
        
        # Customers
        print("Loading customers...")
        customers = pd.DataFrame({
            'email': [f'customer{i}@example.com' for i in range(1, 51)],
            'name': [f'Customer {i}' for i in range(1, 51)],
            'segment': np.random.choice(['Standard', 'Premium', 'VIP'], 50),
            'lifetime_value': np.random.uniform(100, 10000, 50),
        })
        customers.to_sql('customers', engine, if_exists='append', index=False)
        
        # Orders
        print("Loading orders...")
        orders = []
        for i in range(1, 301):
            orders.append({
                'order_number': f'ORD{i:06d}',
                'customer_id': np.random.randint(1, 51),
                'order_date': datetime.now() - timedelta(days=np.random.randint(1, 365)),
                'total_amount': np.random.uniform(50, 5000),
                'status': np.random.choice(['completed', 'pending', 'cancelled'], p=[0.7, 0.2, 0.1]),
            })
        orders_df = pd.DataFrame(orders)
        orders_df.to_sql('orders', engine, if_exists='append', index=False)
        
        # Order Items
        print("Loading order items...")
        order_items = []
        for order_id in range(1, 301):
            num_items = np.random.randint(1, 5)
            for _ in range(num_items):
                order_items.append({
                    'order_id': order_id,
                    'product_id': np.random.randint(1, 101),
                    'quantity': np.random.randint(1, 10),
                    'unit_price': np.random.uniform(10, 500),
                })
        order_items_df = pd.DataFrame(order_items)
        order_items_df.to_sql('order_items', engine, if_exists='append', index=False)
        
        # Inventory
        print("Loading inventory...")
        inventory = pd.DataFrame({
            'product_id': range(1, 101),
            'quantity_on_hand': np.random.randint(0, 500, 100),
            'reorder_point': 50,
            'reorder_quantity': 100,
            'warehouse_location': [f'LOC{i:03d}' for i in range(1, 101)],
        })
        inventory.to_sql('inventory', engine, if_exists='append', index=False)
        
        # Suppliers
        print("Loading suppliers...")
        suppliers = pd.DataFrame({
            'name': ['Supplier A', 'Supplier B', 'Supplier C'],
            'contact_email': ['suppliera@example.com', 'supplierb@example.com', 'supplierc@example.com'],
            'average_lead_time_days': [5, 7, 10],
            'defect_rate': [0.02, 0.03, 0.01],
            'cost_per_unit': [5.0, 6.0, 4.5],
            'reliability_score': [0.95, 0.90, 0.98],
            'capacity': [1000, 1500, 2000],
        })
        suppliers.to_sql('suppliers', engine, if_exists='append', index=False)
        
        print("✅ Sample data loaded successfully!")
        
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    load_sample_data()
