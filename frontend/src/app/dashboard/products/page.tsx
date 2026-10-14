'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { LowStockProduct, Product, ProductCreate } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

const EMPTY_FORM: ProductCreate = { sku: '', name: '', category: '', price: 0, cost: 0, description: '' }

function isLowStockRow(row: Product | LowStockProduct): row is LowStockProduct {
  return 'current_stock' in row
}

export default function ProductsPage() {
  const [rows, setRows] = useState<(Product | LowStockProduct)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductCreate>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadProducts = async (opts: { search?: string; lowStockOnly?: boolean } = {}) => {
    const q = opts.search ?? search
    const low = opts.lowStockOnly ?? lowStockOnly
    setIsLoading(true)
    setError('')
    try {
      if (low) {
        setRows(await apiClient.getLowStockProducts())
      } else if (q.trim()) {
        setRows(await apiClient.searchProducts(q.trim()))
      } else {
        setRows(await apiClient.getProducts(0, 100))
      }
    } catch {
      setError('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!lowStockOnly) loadProducts({ search })
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const toggleLowStock = (checked: boolean) => {
    setLowStockOnly(checked)
    loadProducts({ lowStockOnly: checked })
  }

  const openCreateModal = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingId(p.id)
    setForm({ sku: p.sku, name: p.name, category: p.category, price: p.price, cost: p.cost, description: p.description || '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      if (editingId) {
        await apiClient.updateProduct(editingId, form)
      } else {
        await apiClient.createProduct(form)
      }
      setModalOpen(false)
      await loadProducts()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await apiClient.deleteProduct(id)
      await loadProducts()
    } catch {
      setError('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="header-main flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-1">{rows.length} product{rows.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Product
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-10 sm:pl-11 text-sm"
            placeholder="Search by name or SKU..."
            value={search}
            disabled={lowStockOnly}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 font-medium whitespace-nowrap">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300"
            checked={lowStockOnly}
            onChange={(e) => toggleLowStock(e.target.checked)}
          />
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="hidden sm:inline">Low stock only</span>
          <span className="sm:hidden">Low stock</span>
        </label>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Try adjusting your search or filters" />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="table min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 sm:px-6">SKU</th>
                      <th className="px-3 sm:px-6">Name</th>
                      <th className="px-3 sm:px-6 hidden md:table-cell">Category</th>
                      <th className="px-3 sm:px-6">Price</th>
                      <th className="px-3 sm:px-6 hidden lg:table-cell">Cost</th>
                      <th className="px-3 sm:px-6 hidden lg:table-cell">Margin</th>
                      {lowStockOnly && <th className="px-3 sm:px-6">Stock</th>}
                      <th className="px-3 sm:px-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0
                      return (
                        <tr key={p.id}>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm text-slate-500">{p.sku}</td>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm font-medium">{p.name}</td>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm hidden md:table-cell">{p.category}</td>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm">{formatCurrency(p.price)}</td>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm hidden lg:table-cell">{formatCurrency(p.cost)}</td>
                          <td className="px-3 sm:px-6 text-xs sm:text-sm hidden lg:table-cell">{margin.toFixed(0)}%</td>
                          {lowStockOnly && isLowStockRow(p) && (
                            <td className="px-3 sm:px-6 text-xs sm:text-sm text-yellow-700 font-medium">
                              {p.current_stock} / {p.reorder_point}
                            </td>
                          )}
                          <td className="px-3 sm:px-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="text-slate-400 hover:text-primary-600 transition-colors p-1"
                                aria-label="Edit"
                              >
                                <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                                className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 p-1"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? 'Edit Product' : 'New Product'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" form="product-form" isLoading={isSaving}>
                {editingId ? 'Save Changes' : 'Create Product'}
              </Button>
            </>
          }
        >
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">SKU</label>
              <input
                className="input-field"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
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
              <label className="form-label">Category</label>
              <input
                className="input-field"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  required
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Description</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
