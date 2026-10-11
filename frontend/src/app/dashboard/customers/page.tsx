'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Users, TrendingUp } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Customer, CustomerCreate, CustomerSegment, Order } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge, { statusToVariant } from '@/components/ui/Badge'

const EMPTY_FORM: CustomerCreate = { email: '', name: '', segment: 'Standard', lifetime_value: 0 }
const SEGMENT_OPTIONS = ['Standard', 'Premium', 'VIP', 'At Risk', 'Churned']

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [showTopOnly, setShowTopOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CustomerCreate>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [ordersModalCustomer, setOrdersModalCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const loadCustomers = async (top = showTopOnly) => {
    setIsLoading(true)
    setError('')
    try {
      const [customersData, segmentsData] = await Promise.all([
        top ? apiClient.getTopCustomers(10) : apiClient.getCustomers(0, 100),
        apiClient.getCustomerSegments(),
      ])
      setCustomers(customersData)
      setSegments(segmentsData)
    } catch {
      setError('Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTop = (checked: boolean) => {
    setShowTopOnly(checked)
    loadCustomers(checked)
  }

  const openCreateModal = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEditModal = (c: Customer) => {
    setEditingId(c.id)
    setForm({ email: c.email, name: c.name, segment: c.segment, lifetime_value: c.lifetime_value })
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      if (editingId) {
        await apiClient.updateCustomer(editingId, { name: form.name, segment: form.segment, lifetime_value: form.lifetime_value })
      } else {
        await apiClient.createCustomer(form)
      }
      setModalOpen(false)
      await loadCustomers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save customer')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await apiClient.deleteCustomer(id)
      await loadCustomers()
    } catch {
      setError('Failed to delete customer')
    } finally {
      setDeletingId(null)
    }
  }

  const openOrdersModal = async (c: Customer) => {
    setOrdersModalCustomer(c)
    setOrdersLoading(true)
    try {
      setCustomerOrders(await apiClient.getCustomerOrders(c.id))
    } catch {
      setCustomerOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  return (
    <div>
      <div className="header-main">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} customer{customers.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          New Customer
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {segments.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {segments.map((s) => (
            <div key={s.segment} className="card px-4 py-3 flex items-center gap-3">
              <Badge variant={statusToVariant(s.segment)}>{s.segment}</Badge>
              <div className="text-sm">
                <span className="font-semibold text-slate-900">{s.customer_count}</span>
                <span className="text-slate-500"> · avg {formatCurrency(s.avg_lifetime_value)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium w-fit">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300"
            checked={showTopOnly}
            onChange={(e) => toggleTop(e.target.checked)}
          />
          <TrendingUp className="w-4 h-4 text-primary-500" />
          Top 10 by lifetime value
        </label>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Segment</th>
                  <th>Lifetime Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-slate-500">{c.email}</td>
                    <td>
                      <Badge variant={statusToVariant(c.segment)}>{c.segment}</Badge>
                    </td>
                    <td>{formatCurrency(c.lifetime_value)}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openOrdersModal(c)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          aria-label="View orders"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? 'Edit Customer' : 'New Customer'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" form="customer-form" isLoading={isSaving}>
                {editingId ? 'Save Changes' : 'Create Customer'}
              </Button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input-field disabled:opacity-60"
                required
                disabled={!!editingId}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Name</label>
              <input
                className="input-field"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Segment</label>
              <select
                className="input-field"
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
              >
                {SEGMENT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Lifetime Value</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={form.lifetime_value}
                onChange={(e) => setForm({ ...form, lifetime_value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </form>
        </Modal>
      )}

      {ordersModalCustomer && (
        <Modal title={`Orders — ${ordersModalCustomer.name}`} onClose={() => setOrdersModalCustomer(null)} maxWidth="max-w-lg">
          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : customerOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {customerOrders.map((o) => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{o.order_number}</p>
                    <p className="text-xs text-slate-500">{formatDate(o.order_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(o.total_amount)}</span>
                    <Badge variant={statusToVariant(o.status)}>{o.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  )
}
