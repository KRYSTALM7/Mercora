import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  LoginResponse,
  Product,
  ProductCreate,
  LowStockProduct,
  Customer,
  CustomerCreate,
  CustomerSegment,
  Order,
  OrderCreate,
  OrderItem,
  Inventory,
  MetricsResponse,
  RevenueAnalytics,
  ProductAnalytics,
  CustomerAnalytics,
  ForecastAnalytics,
} from '@/types'
import { SimulateRefundRequest, SimulateRefundResponse } from '@/types/cascade'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
      if (this.token) {
        this.setAuthHeader(this.token)
      }
    }

    // Add response interceptor for 401 handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // ============================================================================
  // Auth Endpoints
  // ============================================================================

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    })
    const { access_token } = response.data
    this.token = access_token
    this.setAuthHeader(access_token)
    localStorage.setItem('access_token', access_token)
    return response.data
  }

  logout(): void {
    this.token = null
    localStorage.removeItem('access_token')
    delete this.client.defaults.headers.common['Authorization']
  }

  // ============================================================================
  // Health & Info Endpoints
  // ============================================================================

  async getHealth(): Promise<{ status: string; timestamp: string; service: string }> {
    const response = await this.client.get('/health')
    return response.data
  }

  async getInfo(): Promise<{ name: string; version: string; description: string }> {
    const response = await this.client.get('/info')
    return response.data
  }

  // ============================================================================
  // Metrics Endpoints
  // ============================================================================

  async getMetrics(days: number = 30): Promise<MetricsResponse> {
    const response = await this.client.get<MetricsResponse>('/api/metrics', {
      params: { days },
    })
    return response.data
  }

  // ============================================================================
  // Products Endpoints
  // ============================================================================

  async getProducts(skip: number = 0, limit: number = 100): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/api/products', {
      params: { skip, limit },
    })
    return response.data
  }

  async searchProducts(q: string): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/api/products/search', {
      params: { q },
    })
    return response.data
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/api/products/category', {
      params: { name: category },
    })
    return response.data
  }

  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const response = await this.client.get<LowStockProduct[]>('/api/products/low-stock')
    return response.data
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.client.get<Product>(`/api/products/${id}`)
    return response.data
  }

  async createProduct(data: ProductCreate): Promise<Product> {
    const response = await this.client.post<Product>('/api/products', data)
    return response.data
  }

  async updateProduct(id: number, data: Partial<ProductCreate>): Promise<Product> {
    const response = await this.client.put<Product>(`/api/products/${id}`, data)
    return response.data
  }

  async deleteProduct(id: number): Promise<{ status: string; id: number }> {
    const response = await this.client.delete(`/api/products/${id}`)
    return response.data
  }

  // ============================================================================
  // Customers Endpoints
  // ============================================================================

  async getCustomers(skip: number = 0, limit: number = 100): Promise<Customer[]> {
    const response = await this.client.get<Customer[]>('/api/customers', {
      params: { skip, limit },
    })
    return response.data
  }

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const response = await this.client.get<CustomerSegment[]>('/api/customers/segments')
    return response.data
  }

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    const response = await this.client.get<Customer[]>('/api/customers/lifetime', {
      params: { limit },
    })
    return response.data
  }

  async getCustomer(id: number): Promise<Customer> {
    const response = await this.client.get<Customer>(`/api/customers/${id}`)
    return response.data
  }

  async getCustomerOrders(id: number): Promise<Order[]> {
    const response = await this.client.get<Order[]>(`/api/customers/${id}/orders`)
    return response.data
  }

  async createCustomer(data: CustomerCreate): Promise<Customer> {
    const response = await this.client.post<Customer>('/api/customers', data)
    return response.data
  }

  async updateCustomer(id: number, data: Partial<CustomerCreate>): Promise<Customer> {
    const response = await this.client.put<Customer>(`/api/customers/${id}`, data)
    return response.data
  }

  async deleteCustomer(id: number): Promise<{ status: string; id: number }> {
    const response = await this.client.delete(`/api/customers/${id}`)
    return response.data
  }

  // ============================================================================
  // Orders Endpoints
  // ============================================================================

  async getOrders(skip: number = 0, limit: number = 100): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/api/orders', {
      params: { skip, limit },
    })
    return response.data
  }

  async getOrder(id: number): Promise<Order> {
    const response = await this.client.get<Order>(`/api/orders/${id}`)
    return response.data
  }

  async getOrderItems(id: number): Promise<OrderItem[]> {
    const response = await this.client.get<OrderItem[]>(`/api/orders/${id}/items`)
    return response.data
  }

  async createOrder(data: OrderCreate): Promise<Order> {
    const response = await this.client.post<Order>('/api/orders', data)
    return response.data
  }

  async updateOrder(id: number, data: Partial<OrderCreate>): Promise<Order> {
    const response = await this.client.put<Order>(`/api/orders/${id}`, data)
    return response.data
  }

  async cancelOrder(id: number): Promise<Order> {
    const response = await this.client.delete<Order>(`/api/orders/${id}`)
    return response.data
  }

  async shipOrder(id: number): Promise<Order> {
    const response = await this.client.post<Order>(`/api/orders/${id}/ship`)
    return response.data
  }

  async refundOrder(id: number): Promise<Order> {
    // DEPRECATED: Direct refunds are disabled to enforce consequence analysis
    // All refund operations must go through Cascade simulation
    throw new Error(
      'Direct refunds are disabled. Use simulateRefund() to analyze consequences before execution. ' +
      'See POST /api/cascade/simulate-refund for the Cascade simulation endpoint.'
    )
  }

  // ============================================================================
  // Inventory Endpoints
  // ============================================================================

  async getInventory(skip: number = 0, limit: number = 100): Promise<Inventory[]> {
    const response = await this.client.get<Inventory[]>('/api/inventory', {
      params: { skip, limit },
    })
    return response.data
  }

  async getLowStockInventory(): Promise<Inventory[]> {
    const response = await this.client.get<Inventory[]>('/api/inventory/low-stock')
    return response.data
  }

  async getInventoryItem(id: number): Promise<Inventory> {
    const response = await this.client.get<Inventory>(`/api/inventory/${id}`)
    return response.data
  }

  async updateInventory(id: number, data: Partial<Inventory>): Promise<Inventory> {
    const response = await this.client.put<Inventory>(`/api/inventory/${id}`, data)
    return response.data
  }

  async reorderInventory(id: number): Promise<Inventory> {
    const response = await this.client.post<Inventory>(`/api/inventory/${id}/reorder`)
    return response.data
  }

  // ============================================================================
  // Analytics Endpoints
  // ============================================================================

  async getRevenueAnalytics(days: number = 30): Promise<RevenueAnalytics> {
    const response = await this.client.get<RevenueAnalytics>('/api/analytics/revenue', {
      params: { days },
    })
    return response.data
  }

  async getProductAnalytics(limit: number = 10): Promise<ProductAnalytics[]> {
    const response = await this.client.get<ProductAnalytics[]>('/api/analytics/products', {
      params: { limit },
    })
    return response.data
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    const response = await this.client.get<CustomerAnalytics>('/api/analytics/customers')
    return response.data
  }

  async getForecastAnalytics(): Promise<ForecastAnalytics> {
    const response = await this.client.get<ForecastAnalytics>('/api/analytics/forecast')
    return response.data
  }

  // ============================================================================
  // Cascade Integration Endpoints
  // ============================================================================

  async simulateRefund(request: SimulateRefundRequest): Promise<SimulateRefundResponse> {
    const response = await this.client.post<SimulateRefundResponse>(
      '/api/cascade/simulate-refund',
      request
    )
    return response.data
  }

  async getCascadeHealth(): Promise<{ status: string; cascade_available: boolean }> {
    try {
      const response = await this.client.get('/api/cascade/health')
      return response.data
    } catch {
      return { status: 'unavailable', cascade_available: false }
    }
  }
}

export const apiClient = new ApiClient()
