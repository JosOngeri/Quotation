import { useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'
import { Plus, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import Pagination from '../components/Pagination'

interface Product {
  id: string
  sku: string
  name: string
  description: string
  unit: string
  category_id: string | null
  category_name: string | null
  variety_id: string | null
  variety_name: string | null
  is_active: boolean
  created_at: string
}

interface Category {
  id: string
  name: string
}

interface Variety {
  id: string
  name: string
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [varieties, setVarieties] = useState<Variety[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    unit: '',
    categoryId: '',
    varietyId: '',
    isActive: true
  })
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search,
      }
      if (categoryFilter) params.categoryId = categoryFilter

      const response = await api.get('/products', { params })
      setProducts(response.data.data)
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      })
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, pagination.page, pagination.pageSize])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/product-categories')
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchVarieties = async (categoryId: string) => {
    if (!categoryId) {
      setVarieties([])
      return
    }
    try {
      const response = await api.get(`/product-categories/${categoryId}/varieties`)
      setVarieties(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch varieties:', error)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description,
        unit: newProduct.unit,
        isActive: newProduct.isActive
      }
      if (newProduct.categoryId) payload.categoryId = newProduct.categoryId
      if (newProduct.varietyId) payload.varietyId = newProduct.varietyId

      await api.post('/products', payload)
      setShowCreateModal(false)
      setNewProduct({ sku: '', name: '', description: '', unit: '', categoryId: '', varietyId: '', isActive: true })
      fetchProducts()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create product')
    }
  }

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page })
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ ...pagination, page: 1, pageSize })
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 text-sm lg:text-base">Manage your product catalog</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Product
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="product-search"
            type="text"
            placeholder="Search products..."
            className="input pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <div className="w-full lg:w-64">
          <label htmlFor="category-filter" className="sr-only">Filter by category</label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-full"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center" aria-label="Filter products">
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">SKU</th>
                <th scope="col" className="pb-3 px-6">Product Name</th>
                <th scope="col" className="pb-3 px-6">Category</th>
                <th scope="col" className="pb-3 px-6">Variety</th>
                <th scope="col" className="pb-3 px-6">Unit</th>
                <th scope="col" className="pb-3 px-6">Status</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">No products found</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">{product.sku}</td>
                    <td className="py-4 px-6">{product.name}</td>
                    <td className="py-4 px-6">{product.category_name || '-'}</td>
                    <td className="py-4 px-6">{product.variety_name || '-'}</td>
                    <td className="py-4 px-6">{product.unit}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="text-primary-600 hover:text-primary-800 mr-2">View</button>
                      <button className="text-gray-600 hover:text-gray-800">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="product-modal-title" className="text-lg font-semibold mb-4">Create New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label htmlFor="product-sku" className="label">SKU</label>
                <input
                    id="product-sku"
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="input"
                    required
                />
              </div>
              <div>
                <label htmlFor="product-name" className="label">Product Name</label>
                <input
                    id="product-name"
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="input"
                    required
                />
              </div>
              <div>
                <label htmlFor="product-desc" className="label">Description</label>
                <input
                    id="product-desc"
                    type="text"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="input"
                />
              </div>
              <div>
                <label htmlFor="product-category" className="label">Category</label>
                <select
                    id="product-category"
                    value={newProduct.categoryId}
                    onChange={(e) => {
                      const categoryId = e.target.value
                      setNewProduct({ ...newProduct, categoryId, varietyId: '' })
                      fetchVarieties(categoryId)
                    }}
                    className="input"
                >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="product-variety" className="label">Variety</label>
                <select
                    id="product-variety"
                    value={newProduct.varietyId}
                    onChange={(e) => setNewProduct({ ...newProduct, varietyId: e.target.value })}
                    className="input"
                    disabled={!newProduct.categoryId}
                >
                    <option value="">Select variety</option>
                    {varieties.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="product-unit" className="label">Unit</label>
                <input
                    id="product-unit"
                    type="text"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="input"
                    required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                    id="product-active"
                    type="checkbox"
                    checked={newProduct.isActive}
                    onChange={(e) => setNewProduct({ ...newProduct, isActive: e.target.checked })}
                    className="w-4 h-4"
                />
                <label htmlFor="product-active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                >
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                    Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
