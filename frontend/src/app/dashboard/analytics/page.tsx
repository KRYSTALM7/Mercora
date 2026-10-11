'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DollarSign, ShoppingCart, Receipt, Target } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/format'
import { CustomerAnalytics, ForecastAnalytics, ProductAnalytics, RevenueAnalytics } from '@/types'
import StatCard from '@/components/ui/StatCard'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

const PIE_COLORS = ['#06b6d4', '#0891b2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']
const DAY_OPTIONS = [7, 30, 90]

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null)
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([])
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null)
  const [forecast, setForecast] = useState<ForecastAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = async (currentDays = days) => {
    setIsLoading(true)
    setError('')
    try {
      const [revenueData, productData, customerData, forecastData] = await Promise.all([
        apiClient.getRevenueAnalytics(currentDays),
        apiClient.getProductAnalytics(10),
        apiClient.getCustomerAnalytics(),
        apiClient.getForecastAnalytics(),
      ])
      setRevenue(revenueData)
      setProductAnalytics(productData)
      setCustomerAnalytics(customerData)
      setForecast(forecastData)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDaysChange = (value: number) => {
    setDays(value)
    loadAll(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="header-main">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Revenue, product, customer & forecast insights</p>
        </div>
        <select
          className="input-field w-fit"
          value={days}
          onChange={(e) => handleDaysChange(parseInt(e.target.value, 10))}
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Revenue" value={formatCurrency(revenue?.total_revenue ?? 0)} icon={DollarSign} accent="success" />
        <StatCard label="Orders" value={revenue?.order_count ?? 0} icon={ShoppingCart} accent="primary" />
        <StatCard label="Avg Order Value" value={formatCurrency(revenue?.average_order_value ?? 0)} icon={Receipt} accent="primary" />
        <StatCard label="Forecast Confidence" value={formatPercent(forecast?.average_confidence ?? 0)} icon={Target} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Top Products by Revenue</h2>
          {productAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productAnalytics} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No product sales data yet" />
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Customer Segments</h2>
          {customerAnalytics && customerAnalytics.segments.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={customerAnalytics.segments}
                    dataKey="count"
                    nameKey="segment"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.segment}: ${entry.count}`}
                  >
                    {customerAnalytics.segments.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-sm text-slate-500 text-center mt-2">
                {customerAnalytics.total_customers} customers · avg lifetime value{' '}
                {formatCurrency(customerAnalytics.average_lifetime_value)}
              </p>
            </>
          ) : (
            <EmptyState title="No customer data yet" />
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-4">AI Recommendation Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900">{forecast?.total_recommendations ?? 0}</p>
            <p className="text-sm text-slate-500">Total Recommendations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatPercent(forecast?.average_confidence ?? 0)}</p>
            <p className="text-sm text-slate-500">Avg Confidence</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatPercent(forecast?.approval_rate ?? 0)}</p>
            <p className="text-sm text-slate-500">Approval Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{forecast?.pending_count ?? 0}</p>
            <p className="text-sm text-slate-500">Pending Review</p>
          </div>
        </div>
      </div>
    </div>
  )
}
