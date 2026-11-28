import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, LoadingSpinner, SectionHeader } from '@/components/shared/Layout'
import { Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductPhoto
} from '@/services/productService'
import { fetchStockItems } from '@/services/stockService'
import type { ProductWithIngredients, StockItemWithStatus, StockUnit } from '@/lib/database.types'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Camera, ShoppingBag, Copy, Package } from 'lucide-react'

const UNITS: StockUnit[] = ['gram', 'kg', 'piece', 'litre', 'ml']

function unitLabel(u: string, qty: number) {
  if (u === 'gram') return `${qty}g`
  if (u === 'kg') return `${qty}kg`
  if (u === 'ml') return `${qty}ml`
  if (u === 'litre') return `${qty}L`
  return `${qty} pcs`
}

export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<ProductWithIngredients[]>([])
  const [stockItems, setStockItems] = useState<StockItemWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState<{ open: boolean; editing?: ProductWithIngredients }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fName, setFName] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fPhoto, setFPhoto] = useState<File | null>(null)
  const [fPhotoPreview, setFPhotoPreview] = useState('')
  const [fIngredients, setFIngredients] = useState<
    { stock_item_id: string; quantity_used: number; unit: StockUnit }[]
  >([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [prods, stock] = await Promise.all([fetchProducts(user.id), fetchStockItems(user.id)])
      setProducts(prods)
      setStockItems(stock)
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  const openAdd = () => {
    setFName(''); setFDesc(''); setFPrice(''); setFPhoto(null); setFPhotoPreview('')
    setFIngredients([{ stock_item_id: '', quantity_used: 0, unit: 'gram' }])
    setModal({ open: true })
  }

  const openEdit = (p: ProductWithIngredients) => {
    setFName(p.name); setFDesc(p.description ?? ''); setFPrice(String(p.default_selling_price))
    setFPhotoPreview(p.photo_url ?? ''); setFPhoto(null)
    setFIngredients(p.ingredients.map(i => ({
      stock_item_id: i.stock_item_id, quantity_used: i.quantity_used, unit: i.unit
    })))
    setModal({ open: true, editing: p })
  }

  const openClone = (p: ProductWithIngredients) => {
    setFName(`${p.name} (copy)`); setFDesc(p.description ?? '')
    setFPrice(String(p.default_selling_price)); setFPhotoPreview(''); setFPhoto(null)
    setFIngredients(p.ingredients.map(i => ({
      stock_item_id: i.stock_item_id, quantity_used: i.quantity_used, unit: i.unit
    })))
    setModal({ open: true })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFPhoto(file)
    setFPhotoPreview(URL.createObjectURL(file))
  }

  const addIngredient = () =>
    setFIngredients(prev => [...prev, { stock_item_id: '', quantity_used: 0, unit: 'gram' }])

  const removeIngredient = (idx: number) =>
    setFIngredients(prev => prev.filter((_, i) => i !== idx))

  const updateIngredient = (idx: number, field: string, value: string | number) =>
    setFIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing))

  const save = async () => {
    if (!user || !fName.trim()) return
    setSaving(true)
    try {
      const validIngredients = fIngredients.filter(i => i.stock_item_id && i.quantity_used > 0)
      const payload = {
        name: fName.trim(),
        description: fDesc || undefined,
        default_selling_price: parseFloat(fPrice) || 0,
        ingredients: validIngredients,
      }

      let photoUrl = modal.editing?.photo_url ?? undefined
      if (fPhoto) {
        try {
          const id = modal.editing?.id ?? crypto.randomUUID()
          photoUrl = await uploadProductPhoto(fPhoto, id)
        } catch {
          // Storage bucket not configured — save without photo
          console.warn('Photo upload failed, saving without photo')
        }
      }

      if (modal.editing) {
        await updateProduct(modal.editing.id, { ...payload, photo_url: photoUrl })
      } else {
        await createProduct(user.id, { ...payload, photo_url: photoUrl })
      }
      setModal({ open: false })
      await load()
    } finally { setSaving(false) }
  }

  const deleteP = async (id: string) => {
    setSaving(true)
    try { await deleteProduct(id); setDeleteConfirm(null); await load() }
    finally { setSaving(false) }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Products"
        subtitle="Your chocolate recipes & creations"
        action={
          <Button onClick={openAdd} className="gradient-brand border-0 text-white gap-2">
            <Plus size={16} /> Add Product
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{products.length}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Total Products</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-emerald-400">{products.filter(p => p.is_active).length}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Active</p>
        </div>
      </div>

      <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary/50" />

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No products yet"
          description="Create your first product recipe — like Choco Turffi or Baraka Chocolate. Set ingredients and pricing."
          action={<Button onClick={openAdd} className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> Add First Product</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="glass rounded-2xl overflow-hidden border border-border card-hover">
              {/* Photo or emoji */}
              <div className="relative h-32 bg-gradient-to-br from-purple-900/40 to-pink-900/30 flex items-center justify-center">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl opacity-60">🍫</span>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => openClone(p)}
                    className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60"
                    title="Clone product">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => openEdit(p)}
                    className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setDeleteConfirm(p.id)}
                    className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-rose-400 flex items-center justify-center hover:bg-black/60">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-foreground">{p.name}</h3>
                    {p.description && <p className="text-muted-foreground text-xs mt-0.5">{p.description}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-primary font-bold text-lg"><Currency amount={p.default_selling_price} /></p>
                    <p className="text-muted-foreground text-xs">sell price</p>
                  </div>
                </div>

                {/* Ingredients */}
                {p.ingredients.length > 0 && (
                  <div className="space-y-1 mb-3">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Recipe</p>
                    {p.ingredients.map(ing => (
                      <div key={ing.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Package size={10} /> {ing.stock_item?.name}
                        </span>
                        <span className="text-foreground">{unitLabel(ing.unit, ing.quantity_used)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Link to={`/orders/new?product=${p.id}`}>
                  <Button size="sm" className="w-full gradient-brand border-0 text-white gap-2 mt-1">
                    <ShoppingBag size={14} /> Create Order
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {/* Add product card */}
          <button onClick={openAdd}
            className="glass rounded-2xl border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground hover:text-primary min-h-[200px]">
            <Plus size={28} />
            <p className="font-medium text-sm">Add New Product</p>
          </button>
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="modal-glass rounded-2xl w-full max-w-lg p-6 animate-slide-up my-auto">
            <h2 className="text-lg font-bold font-display mb-5">
              {modal.editing ? 'Edit Product' : 'Add Product'}
            </h2>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Photo */}
              <div>
                <Label className="text-muted-foreground text-sm">Product Photo (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div
                    className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 overflow-hidden border-2 border-dashed border-border"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {fPhotoPreview ? (
                      <img src={fPhotoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                      {fPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    <p className="text-muted-foreground text-xs mt-1">JPG, PNG up to 5MB</p>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Product Name *</Label>
                <Input value={fName} onChange={e => setFName(e.target.value)}
                  placeholder="e.g. Choco Turffi" className="mt-1 bg-secondary/50" />
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Description (optional)</Label>
                <Input value={fDesc} onChange={e => setFDesc(e.target.value)}
                  placeholder="Short description" className="mt-1 bg-secondary/50" />
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Default Selling Price (₹) *</Label>
                <Input type="number" value={fPrice} onChange={e => setFPrice(e.target.value)}
                  placeholder="e.g. 200" className="mt-1 bg-secondary/50" />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground text-sm">Ingredients / Recipe</Label>
                  <button onClick={addIngredient} className="text-primary text-xs font-medium hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {fIngredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ing.stock_item_id}
                        onChange={e => updateIngredient(idx, 'stock_item_id', e.target.value)}
                        className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Select item</option>
                        {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <Input
                        type="number" placeholder="Qty"
                        value={ing.quantity_used || ''}
                        onChange={e => updateIngredient(idx, 'quantity_used', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-secondary/50 text-sm"
                      />
                      <select
                        value={ing.unit}
                        onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                        className="w-20 bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button onClick={() => removeIngredient(idx)} className="text-rose-400 hover:text-rose-300 text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setModal({ open: false })} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving || !fName.trim()} className="flex-1 gradient-brand border-0 text-white">
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="modal-glass rounded-2xl w-full max-w-sm p-6 text-center animate-slide-up">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold mb-2">Delete Product?</h3>
            <p className="text-muted-foreground text-sm mb-6">This product will be removed from your list.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => deleteP(deleteConfirm)} disabled={saving} className="flex-1 bg-destructive text-white border-0">
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


