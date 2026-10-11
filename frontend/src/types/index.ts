// Auth Types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface User {
  email: string
}

// Product Types
export interface Product {
  id: number
  sku: string
  name: string
  category: string
  price: number
  cost: number
  description?: string
}

export interface ProductCreate {
  sku: string
  name: string
  category: string
  price: number
  cost: number
  description?: string
}

// Customer Types
export interface Customer {
  id: number
  email: string
  name: string
  segment: string
  lifetime_value: number
}

export interface CustomerCreate {
  email: string
  name: string
  segment?: string
  lifetime_value?: number
}

// Order Types
export interface Order {
  id: number
  order_number: string
  customer_id: number
  order_date: string
  total_amount: number
  status: string
}

export interface OrderCreate {
  order_number: string
  customer_id: number
  order_date?: string
  total_amount: number
  status?: string
}

export interface OrderItem {
  id: number
  product_id: number
  quantity: number
  unit_price: number
}

// Inventory Types
export interface Inventory {
  id: number
  product_id: number
  quantity_on_hand: number
  reorder_point: number
  reorder_quantity: number
  warehouse_location?: string
  last_restock_date?: string
}

// Analytics Types
export interface MetricsResponse {
  period_days: number
  sales: {
    total_sales: number
    order_count: number
  }
  inventory: {
    total_products: number
    low_stock_items: number
  }
  top_products: Array<{
    id: number
    sku: string
    name: string
    price: number
  }>
}

export interface RevenueAnalytics {
  period_days: number
  total_revenue: number
  order_count: number
  average_order_value: number
}

export interface ProductAnalytics {
  sku: string
  name: string
  units_sold: number
  revenue: number
}

export interface CustomerAnalytics {
  total_customers: number
  segments: Array<{ segment: string; count: number }>
  average_lifetime_value: number
}

export interface CustomerSegment {
  segment: string
  customer_count: number
  avg_lifetime_value: number
}

export interface ForecastAnalytics {
  total_recommendations: number
  average_confidence: number
  approval_rate: number
  pending_count: number
}

export interface LowStockProduct extends Product {
  current_stock: number
  reorder_point: number
}

// API Response Types
export interface ApiError {
  detail: string
  status_code?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// UI State Types
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface TableState {
  sortBy: string | null
  sortOrder: 'asc' | 'desc'
  pageSize: number
  currentPage: number
  search: string
}
