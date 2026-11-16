import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, LoadingSpinner } from '@/components/shared/Layout'
import { Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchProducts } from '@/services/productService'
import { searchCustomers, createCustomer } from '@/services/customerService'
import { createOrder } from '@/services/orderService'
import type {
  ProductWithIngredients, Customer, OrderStatus, PaymentMethod
} from '@/lib/database.types'
import { Search, Plus, Trash2, User, Package } from 'lucide-react'

interface OrderItemDraft {
  product_id?: string
  product_name: string
  quantity: number
  cost_price: number
  selling_price: number
  notes: string
}

interface OrderExtraDraft {
  description: string
  amount: number
  type: 'cost' | 'revenue'
}

export default function NewOrderPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [products, setProducts] = useState<ProductWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [saveNewCustomer, setSaveNewCustomer] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Order items
  const [items, setItems] = useState<OrderItemDraft[]>([])
  const [extras, setExtras] = useState<OrderExtraDraft[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  // Order meta
  const [status, setStatus] = useState<OrderStatus>('pending')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const prods = await fetchProducts(user.id)
      setProducts(prods)
      // Pre-select if came from product page
      const preselect = params.get('product')
      if (preselect) {
        const p = prods.find(pr => pr.id === preselect)
        if (p) addProduct(p)
      }
    } finally { setLoading(false) }
  }, [user, params])

  useEffect(() => { void load() }, [load])

  // Customer search
  useEffect(() => {
    if (!user || customerSearch.length < 2) { setCustomerSuggestions([]); return }
    if (searchTimeout) clearTimeout(searchTimeout)
    const t = setTimeout(async () => {
      const results = await searchCustomers(user.id, customerSearch)
      setCustomerSuggestions(results)
    }, 300)
    setSearchTimeout(t)
    return () => clearTimeout(t)
  }, [customerSearch, user])

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setCustomerPhone(c.phone ?? '')
    setCustomerAddress(c.address ?? '')
    setCustomerSearch('')
    setCustomerSuggestions([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
  }

  const addProduct = (p: ProductWithIngredients) => {
    setItems(prev => [...prev, {
      product_id: p.id,
      product_name: p.name,
      quantity: 1,
      cost_price: p.estimated_cost || 0,
      selling_price: p.default_selling_price,
      notes: '',
    }])
    setShowProductPicker(false)
    setProductSearch('')
  }

  const updateItem = (idx: number, field: keyof OrderItemDraft, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const addExtra = () => setExtras(prev => [...prev, { description: '', amount: 0, type: 'cost' }])
  const updateExtra = (idx: number, field: keyof OrderExtraDraft, value: string | number) => {
    setExtras(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }
  const removeExtra = (idx: number) => setExtras(prev => prev.filter((_, i) => i !== idx))

  // Totals
  const itemsCost    = items.reduce((s, i) => s + i.cost_price * i.quantity, 0)
  const itemsSell    = items.reduce((s, i) => s + i.selling_price * i.quantity, 0)
  const extrasCost   = extras.filter(e => e.type === 'cost').reduce((s, e) => s + e.amount, 0)
  const extrasRev    = extras.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0)
  const totalCost    = itemsCost + extrasCost
  const totalSelling = itemsSell + extrasRev
  const profit       = totalSelling - totalCost

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!user || items.length === 0) return
    setSaving(true)
    try {
      // Save new customer if needed
      let customerId = selectedCustomer?.id
      if (!selectedCustomer && customerName && saveNewCustomer) {
        const newC = await createCustomer(user.id, {
          name: customerName, phone: customerPhone || undefined, address: customerAddress || undefined
        })
        customerId = newC.id
      }

      await createOrder(user.id, {
        customer_id: customerId,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        status,
        payment_method: status === 'paid' ? paymentMethod : null,
        notes: notes || undefined,
        ordered_at: new Date().toISOString(),
        items: items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          cost_price: i.cost_price,
          selling_price: i.selling_price,
          notes: i.notes || undefined,
        })),
        extras: extras.filter(e => e.description && e.amount > 0),
      })

      navigate('/orders')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="New Order" back={() => navigate('/orders')} />

      {/* ── CUSTOMER ─────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-border">
        <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
          <User size={16} className="text-primary" /> Customer (optional)
        </h2>

        {selectedCustomer ? (
          <div className="flex items-center justify-between bg-primary/10 rounded-xl p-3">
            <div>
              <p className="text-foreground font-medium text-sm">{selectedCustomer.name}</p>
              <p className="text-muted-foreground text-xs">{selectedCustomer.phone} · {selectedCustomer.address}</p>
            </div>
            <button onClick={clearCustomer} className="text-muted-foreground hover:text-rose-400 text-lg">×</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                placeholder="Search existing customer by name or phone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="pl-9 bg-secondary/50 text-sm"
              />
              {customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 glass border border-border rounded-xl overflow-hidden z-10 shadow-xl">
                  {customerSuggestions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors border-b border-border last:border-0"
                    >
                      <p className="text-foreground text-sm font-medium">{c.name}</p>
                      <p className="text-muted-foreground text-xs">{c.phone} · {c.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-secondary/50 text-sm" />
              <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="bg-secondary/50 text-sm" />
              <Input placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="bg-secondary/50 text-sm" />
            </div>
            {customerName && !selectedCustomer && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={saveNewCustomer} onChange={e => setSaveNewCustomer(e.target.checked)} className="accent-purple-500" />
                Save to customer directory
              </label>
            )}
          </div>
        )}
      </div>

      {/* ── ORDER ITEMS ──────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Package size={16} className="text-primary" /> Products
          </h2>
          <button
            onClick={() => setShowProductPicker(!showProductPicker)}
            className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>

        {/* Product picker */}
        {showProductPicker && (
          <div className="mb-4 glass rounded-xl border border-primary/30 p-3">
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="bg-secondary/50 text-sm mb-2"
              autoFocus
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-left"
                >
                  <span className="text-foreground text-sm">{p.name}</span>
                  <span className="text-primary text-sm font-medium"><Currency amount={p.default_selling_price} /></span>
                </button>
              ))}
              <button
                onClick={() => {
                  setItems(prev => [...prev, { product_name: productSearch || 'Custom item', quantity: 1, cost_price: 0, selling_price: 0, notes: '' }])
                  setShowProductPicker(false)
                  setProductSearch('')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-left text-muted-foreground text-sm"
              >
                <Plus size={12} /> Add custom item: "{productSearch || '...'}"
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No products added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-4">Product</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-center">Cost (₹)</span>
              <span className="col-span-2 text-center">Sell (₹)</span>
              <span className="col-span-1 text-center">Profit</span>
              <span className="col-span-1"></span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Input
                    value={item.product_name}
                    onChange={e => updateItem(idx, 'product_name', e.target.value)}
                    className="bg-secondary/50 text-sm h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number" min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                    className="bg-secondary/50 text-sm h-8 text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.cost_price}
                    onChange={e => updateItem(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                    className="bg-secondary/50 text-sm h-8 text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.selling_price}
                    onChange={e => updateItem(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                    className="bg-secondary/50 text-sm h-8 text-center"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-xs font-medium ${
                    (item.selling_price - item.cost_price) * item.quantity >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ₹{((item.selling_price - item.cost_price) * item.quantity).toFixed(0)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── EXTRAS ───────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">Extras / Add-ons</h2>
          <button onClick={addExtra} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
            <Plus size={14} /> Add Extra
          </button>
        </div>
        {extras.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-3">
            Delivery charge, packaging cost, special ingredient, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {extras.map((extra, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Description (e.g. Delivery charge)"
                  value={extra.description}
                  onChange={e => updateExtra(idx, 'description', e.target.value)}
                  className="flex-1 bg-secondary/50 text-sm h-8"
                />
                <Input
                  type="number" placeholder="₹"
                  value={extra.amount || ''}
                  onChange={e => updateExtra(idx, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-20 bg-secondary/50 text-sm h-8"
                />
                <select
                  value={extra.type}
                  onChange={e => updateExtra(idx, 'type', e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground focus:outline-none"
                >
                  <option value="cost">Cost</option>
                  <option value="revenue">Revenue</option>
                </select>
                <button onClick={() => removeExtra(idx)} className="text-muted-foreground hover:text-rose-400"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ORDER SUMMARY ─────────────────────────── */}
      {items.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-primary/20 space-y-3">
          <h2 className="font-semibold text-foreground">Order Summary</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
              <span><Currency amount={itemsSell} /></span>
            </div>
            {extrasRev > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Extras (revenue)</span>
                <span><Currency amount={extrasRev} /></span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
              <span>Total</span>
              <span><Currency amount={totalSelling} /></span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total Cost</span>
              <span><Currency amount={totalCost} /></span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Profit</span>
              <span className={profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {profit >= 0 ? '+' : ''}₹{profit.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS & NOTES ─────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-border space-y-4">
        <div>
          <Label className="text-muted-foreground text-sm">Order Status</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['pending', 'delivered', 'paid'] as OrderStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                  status === s ? 'gradient-brand text-white' : 'glass text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'pending' ? '⏳ Pending' : s === 'delivered' ? '📦 Delivered' : '✅ Paid'}
              </button>
            ))}
          </div>
        </div>

        {status === 'paid' && (
          <div>
            <Label className="text-muted-foreground text-sm">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['cash', 'online'] as PaymentMethod[]).map(m => (
                <button
                  key={m!}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${
                    paymentMethod === m ? 'gradient-brand text-white' : 'glass text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'cash' ? '💵 Cash' : '📱 Online'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label className="text-muted-foreground text-sm">Notes (optional)</Label>
          <Input
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any special notes..."
            className="mt-1 bg-secondary/50"
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={saving || items.length === 0}
        className="w-full gradient-brand border-0 text-white py-6 text-base font-semibold rounded-xl"
      >
        {saving ? 'Creating Order...' : `Create Order${items.length > 0 ? ` · ₹${totalSelling.toFixed(0)}` : ''}`}
      </Button>
    </div>
  )
}
