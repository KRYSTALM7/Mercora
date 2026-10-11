'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Pencil, RefreshCw, Warehouse } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Inventory, Product } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reorderingId, setReorderingId] = useState<number | null>(null)

  const [editingItem, setEditingItem] = useState<Inventory | null>(null)
  const [form, setForm] = useState({ quantity_on_hand: 0, reorder_point: 0, reorder_quantity: 0, warehouse_location: '' })
  const [isSaving, setIsSaving] = useState(false)

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const loadData = async (low = lowStockOnly) => {
    setIsLoading(true)
    setError('')
    try {
      const [inventoryData, productsData] = await Promise.all([
        low ? apiClient.getLowStockInventory() : apiClient.getInventory(0, 100),
        apiClient.getProducts(0, 100),
      ])
      setInventory(inventoryData)
      setProducts(productsData)
    } catch {
      setError('Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLowStock = (checked: boolean) => {
    setLowStockOnly(checked)
    loadData(checked)
  }

  const handleReorder = async (id: number) => {
    setReorderingId(id)
    setError('')
    try {
      const updated = await apiClient.reorderInventory(id)
      setInventory((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch {
      setError('Failed to reorder')
    } finally {
      setReorderingId(null)
    }
  }

  const openEditModal = (item: Inventory) => {
    setEditingItem(item)
    setForm({
      quantity_on_hand: item.quantity_on_hand,
      reorder_point: item.reorder_point,
      reorder_quantity: item.reorder_quantity,
      warehouse_location: item.warehouse_location || '',
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setIsSaving(true)
    setError('')
    try {
      const updated = await apiClient.updateInventory(editingItem.id, form)
      setInventory((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)))
      setEditingItem(null)
    } catch {
      setError('Failed to update inventory')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="header-main">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">{inventory.length} record{inventory.length === 1 ? '' : 's'}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300"
            checked={lowStockOnly}
            onChange={(e) => toggleLowStock(e.target.checked)}
          />
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Low stock only
        </label>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState icon={Warehouse} title="No inventory records found" />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>On Hand</th>
                  <th>Reorder Point</th>
                  <th>Reorder Qty</th>
                  <th>Location</th>
                  <th>Last Restock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const product = productMap.get(item.product_id)
                  const isLow = item.quantity_on_hand < item.reorder_point
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {product ? `${product.name} (${product.sku})` : `Product #${item.product_id}`}
                      </td>
                      <td className={isLow ? 'text-yellow-700 font-semibold' : ''}>{item.quantity_on_hand}</td>
                      <td>{item.reorder_point}</td>
                      <td>{item.reorder_quantity}</td>
                      <td className="text-slate-500">{item.warehouse_location || '—'}</td>
                      <td className="text-slate-500">{formatDate(item.last_restock_date)}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {isLow && (
                            <button
                              type="button"
                              onClick={() => handleReorder(item.id)}
                              disabled={reorderingId === item.id}
                              className="text-slate-400 hover:text-primary-600 transition-colors disabled:opacity-50"
                              aria-label="Reorder"
                              title="Reorder"
                            >
                              <RefreshCw className={`w-4 h-4 ${reorderingId === item.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="text-slate-400 hover:text-primary-600 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingItem && (
        <Modal
          title={`Edit Inventory — ${productMap.get(editingItem.product_id)?.name || editingItem.product_id}`}
          onClose={() => setEditingItem(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingItem(null)} type="button">
                Cancel
              </Button>
              <Button type="submit" form="inventory-form" isLoading={isSaving}>
                Save Changes
              </Button>
            </>
          }
        >
          <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">Quantity on Hand</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.quantity_on_hand}
                onChange={(e) => setForm({ ...form, quantity_on_hand: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Reorder Point</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.reorder_point}
                  onChange={(e) => setForm({ ...form, reorder_point: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Reorder Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.reorder_quantity}
                  onChange={(e) => setForm({ ...form, reorder_quantity: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Warehouse Location</label>
              <input
                className="input-field"
                value={form.warehouse_location}
                onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
