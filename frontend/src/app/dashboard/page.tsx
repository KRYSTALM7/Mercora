'use client'

import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { MetricsResponse } from '@/types'
import StatCard from '@/components/ui/StatCard'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const metricsData = await apiClient.getMetrics(30)
      setMetrics(metricsData)
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your operations, last {metrics?.period_days ?? 30} days</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Sales" value={formatCurrency(metrics?.sales.total_sales ?? 0)} icon={DollarSign} accent="success" />
        <StatCard label="Orders" value={metrics?.sales.order_count ?? 0} icon={ShoppingCart} accent="primary" />
        <StatCard label="Total Products" value={metrics?.inventory.total_products ?? 0} icon={Package} accent="primary" />
        <StatCard label="Low Stock Items" value={metrics?.inventory.low_stock_items ?? 0} icon={AlertTriangle} accent="warning" />
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Top Products</h2>
        </div>
        {metrics && metrics.top_products.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {metrics.top_products.map((p) => (
                  <tr key={p.id}>
                    <td className="text-slate-500">{p.sku}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{formatCurrency(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No product data yet" description="Top products will appear once orders come in" />
        )}
      </div>
    </div>
  )
}
