'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Eye, Truck, XCircle, ShoppingCart, Zap, Mic } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Customer, Order, OrderCreate, OrderItem, Product } from '@/types'
import { CascadeActionDetail } from '@/types/cascade'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge, { statusToVariant } from '@/components/ui/Badge'
import CascadeSimulationModal from '@/components/cascade/CascadeSimulationModal'
import VoiceRecorder from '@/components/voice/VoiceRecorder'

const EMPTY_FORM: OrderCreate = { order_number: '', customer_id: 0, total_amount: 0, status: 'pending' }

// Demo order mapping: Only these Mercora order IDs can be simulated with Cascade
// This matches the backend DEMO_ORDER_MAPPING in cascade_integration.py
// These are the seeded demo orders created by backend/scripts/seed_demo_data.py
const DEMO_ORDER_IDS = [21, 22, 23, 25, 27, 30, 35, 40]

const isDemoOrder = (orderId: number): boolean => {
  return DEMO_ORDER_IDS.includes(orderId)
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState<number | null>(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form, setForm] = useState<OrderCreate>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const [itemsModalOrder, setItemsModalOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Cascade simulation state
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false)
  const [cascadeSimulating, setCascadeSimulating] = useState(false)
  const [cascadeAction, setCascadeAction] = useState<CascadeActionDetail | null>(null)
  const [cascadeError, setCascadeError] = useState<string | null>(null)
  const [simulatingOrderId, setSimulatingOrderId] = useState<number | null>(null)

  // Voice input state
  const [voiceInputModalOpen, setVoiceInputModalOpen] = useState(false)
  const [voiceInputOrder, setVoiceInputOrder] = useState<Order | null>(null)
  const [transcribedText, setTranscribedText] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers])
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        apiClient.getOrders(0, 100),
        apiClient.getCustomers(0, 100),
        apiClient.getProducts(0, 100),
      ])
      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
    } catch {
      setError('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const statuses = useMemo(() => Array.from(new Set(orders.map((o) => o.status))).sort(), [orders])
  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)

  const runAction = async (id: number, action: () => Promise<Order>) => {
    setActioningId(id)
    setError('')
    try {
      const updated = await action()
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    } catch {
      setError('Failed to update order')
    } finally {
      setActioningId(null)
    }
  }

  const openItemsModal = async (order: Order) => {
    setItemsModalOrder(order)
    setItemsLoading(true)
    try {
      setOrderItems(await apiClient.getOrderItems(order.id))
    } catch {
      setOrderItems([])
    } finally {
      setItemsLoading(false)
    }
  }

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM, customer_id: customers[0]?.id ?? 0 })
    setCreateModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      await apiClient.createOrder(form)
      setCreateModalOpen(false)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create order')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSimulateRefund = async (order: Order) => {
    setSimulatingOrderId(order.id)
    setCascadeSimulating(true)
    setCascadeError(null)
    setCascadeAction(null)
    setCascadeModalOpen(true)

    try {
      const response = await apiClient.simulateRefund({ order_id: order.id })
      
      if (response.status === 'error' || response.status === 'unauthorized' || response.status === 'unavailable') {
        setCascadeError(response.error || 'Simulation failed')
      } else if (response.cascade_action) {
        setCascadeAction(response.cascade_action)
      } else {
        setCascadeError('No simulation result received')
      }
    } catch (err: any) {
      // Handle demo scope errors specially
      const detail = err.response?.data?.detail
      if (detail && typeof detail === 'object' && detail.error === 'Order not in demo scope') {
        setCascadeError(
          `${detail.message}\n\nAvailable demo order IDs: ${detail.demo_order_ids?.join(', ')}`
        )
      } else {
        setCascadeError(err.response?.data?.detail || err.message || 'Failed to simulate refund')
      }
    } finally {
      setCascadeSimulating(false)
      setSimulatingOrderId(null)
    }
  }

  const openVoiceInputModal = (order: Order) => {
    setVoiceInputOrder(order)
    setTranscribedText('')
    setVoiceError(null)
    setVoiceInputModalOpen(true)
  }

  const handleVoiceTranscript = (text: string) => {
    setTranscribedText(text)
    setVoiceError(null)
  }

  const handleVoiceError = (error: string) => {
    setVoiceError(error)
  }

  const confirmVoiceInput = async () => {
    if (!voiceInputOrder || !transcribedText.trim()) return
    
    // Close voice modal and open simulation modal
    setVoiceInputModalOpen(false)
    
    // For now, automatically trigger simulation
    // In a real implementation, you'd parse the transcribed text
    // to extract the action parameters (amount, reason, etc.)
    await handleSimulateRefund(voiceInputOrder)
  }

  return (
    <div>
      <div className="header-main">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={openCreateModal} disabled={customers.length === 0}>
          <Plus className="w-4 h-4" />
          New Order
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-6">
        <select className="input-field w-fit" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.order_number}</td>
                    <td className="text-slate-500">{customerMap.get(o.customer_id) || `#${o.customer_id}`}</td>
                    <td className="text-slate-500">{formatDate(o.order_date)}</td>
                    <td>{formatCurrency(o.total_amount)}</td>
                    <td>
                      <Badge variant={statusToVariant(o.status)}>{o.status}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openItemsModal(o)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          aria-label="View items"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(o.status === 'shipped' || o.status === 'completed') && isDemoOrder(o.id) && (
                          <>
                            <button
                              type="button"
                              onClick={() => openVoiceInputModal(o)}
                              disabled={simulatingOrderId === o.id}
                              className="text-slate-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                              aria-label="Voice input for refund (demo)"
                              title="Use voice to request refund (demo orders only)"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSimulateRefund(o)}
                              disabled={simulatingOrderId === o.id}
                              className="text-slate-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                              aria-label="Simulate refund with Cascade (demo)"
                              title="Simulate refund with Cascade (demo orders only)"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {o.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => runAction(o.id, () => apiClient.shipOrder(o.id))}
                            disabled={actioningId === o.id}
                            className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                            aria-label="Ship order"
                            title="Ship order"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                        {o.status !== 'cancelled' && o.status !== 'refunded' && (
                          <button
                            type="button"
                            onClick={() => runAction(o.id, () => apiClient.cancelOrder(o.id))}
                            disabled={actioningId === o.id}
                            className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            aria-label="Cancel order"
                            title="Cancel order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemsModalOrder && (
        <Modal title={`Items — ${itemsModalOrder.order_number}`} onClose={() => setItemsModalOrder(null)} maxWidth="max-w-lg">
          {itemsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : orderItems.length === 0 ? (
            <EmptyState title="No items on this order" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {orderItems.map((item) => {
                const product = productMap.get(item.product_id)
                return (
                  <li key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{product?.name || `Product #${item.product_id}`}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Modal>
      )}

      {createModalOpen && (
        <Modal
          title="New Order"
          onClose={() => setCreateModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" form="order-form" isLoading={isSaving}>
                Create Order
              </Button>
            </>
          }
        >
          <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">Order Number</label>
              <input
                className="input-field"
                required
                placeholder="ORD-1001"
                value={form.order_number}
                onChange={(e) => setForm({ ...form, order_number: e.target.value })}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Customer</label>
              <select
                className="input-field"
                required
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: parseInt(e.target.value, 10) })}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Total Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                required
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Status</label>
              <select
                className="input-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="pending">pending</option>
                <option value="shipped">shipped</option>
                <option value="completed">completed</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      <CascadeSimulationModal
        isOpen={cascadeModalOpen}
        onClose={() => setCascadeModalOpen(false)}
        cascadeAction={cascadeAction}
        isLoading={cascadeSimulating}
        error={cascadeError}
      />

      {voiceInputModalOpen && voiceInputOrder && (
        <Modal
          title={`Voice Order Action — ${voiceInputOrder.order_number}`}
          onClose={() => setVoiceInputModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setVoiceInputModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button
                onClick={confirmVoiceInput}
                disabled={!transcribedText.trim()}
              >
                Confirm & Simulate
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Order:</strong> {voiceInputOrder.order_number}<br />
                <strong>Total:</strong> {formatCurrency(voiceInputOrder.total_amount)}<br />
                <strong>Status:</strong> {voiceInputOrder.status}
              </p>
            </div>

            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Input
              </label>
              <div className="flex items-center gap-3">
                <textarea
                  className="input-field flex-1"
                  rows={3}
                  placeholder="Click the microphone to record your request, or type here..."
                  value={transcribedText}
                  onChange={(e) => setTranscribedText(e.target.value)}
                />
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  onError={handleVoiceError}
                  disabled={!!transcribedText.trim()}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Example: &ldquo;Please issue a partial refund of ₹3,000 for this order&rdquo;
              </p>
            </div>

            {voiceError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {voiceError}
              </div>
            )}

            {transcribedText && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-1">Transcribed Request:</p>
                <p className="text-sm text-green-800">{transcribedText}</p>
                <p className="text-xs text-green-600 mt-2">
                  Review the text above and click &ldquo;Confirm & Simulate&rdquo; to analyze consequences
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
