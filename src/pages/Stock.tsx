import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, SectionHeader, EmptyState, LoadingSpinner } from '@/components/shared/Layout'
import { StockBadge, Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import {
  fetchStockItems, createStockItem, updateStockItem, deleteStockItem,
  createPurchase, fetchPurchases
} from '@/services/stockService'
import type { StockItemWithStatus, StockPurchase, StockUnit } from '@/lib/database.types'
import { Plus, Package, Pencil, Trash2, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const UNITS: StockUnit[] = ['gram', 'kg', 'piece', 'litre', 'ml']

function unitLabel(unit: StockUnit, qty: number) {
  if (unit === 'gram') return `${qty}g`
  if (unit === 'kg') return `${qty}kg`
  if (unit === 'ml') return `${qty}ml`
  if (unit === 'litre') return `${qty}L`
  return `${qty} pcs`
}

export default function StockPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<StockItemWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<Record<string, StockPurchase[]>>({})

  // Modal state
  const [itemModal, setItemModal] = useState<{ open: boolean; editing?: StockItemWithStatus }>({ open: false })
  const [purchaseModal, setPurchaseModal] = useState<{ open: boolean; item?: StockItemWithStatus }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state - item
  const [formName, setFormName] = useState('')
  const [formUnit, setFormUnit] = useState<StockUnit>('gram')
  const [formQty, setFormQty] = useState('')
  const [formThreshold, setFormThreshold] = useState('')

  // Form state - purchase
  const [pQty, setPQty] = useState('')
  const [pCost, setPCost] = useState('')
  const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0])
  const [pNotes, setPNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try { setItems(await fetchStockItems(user.id)) }
    catch { /* handled */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  const loadPurchases = async (itemId: string) => {
    if (purchases[itemId]) return
    const data = await fetchPurchases(itemId)
    setPurchases(prev => ({ ...prev, [itemId]: data }))
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    void loadPurchases(id)
  }

  const openAddItem = () => {
    setFormName(''); setFormUnit('gram'); setFormQty('0'); setFormThreshold('100')
    setItemModal({ open: true })
  }
  const openEditItem = (item: StockItemWithStatus) => {
    setFormName(item.name); setFormUnit(item.unit)
    setFormQty(String(item.current_quantity)); setFormThreshold(String(item.low_stock_threshold))
    setItemModal({ open: true, editing: item })
  }

  const saveItem = async () => {
    if (!user || !formName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: formName.trim(), unit: formUnit,
        current_quantity: parseFloat(formQty) || 0,
        low_stock_threshold: parseFloat(formThreshold) || 0,
      }
      if (itemModal.editing) {
        await updateStockItem(itemModal.editing.id, payload)
      } else {
        await createStockItem(user.id, payload)
      }
      setItemModal({ open: false })
      await load()
    } finally { setSaving(false) }
  }

  const deleteItem = async (id: string) => {
    setSaving(true)
    try { await deleteStockItem(id); setDeleteConfirm(null); await load() }
    finally { setSaving(false) }
  }

  const savePurchase = async () => {
    if (!user || !purchaseModal.item) return
    setSaving(true)
    try {
      await createPurchase(user.id, {
        stock_item_id: purchaseModal.item.id,
        quantity_purchased: parseFloat(pQty),
        cost_per_unit: parseFloat(pCost) / parseFloat(pQty),
        purchased_at: pDate,
        notes: pNotes || undefined,
      })
      setPurchases(prev => { const n = { ...prev }; delete n[purchaseModal.item!.id]; return n })
      setPurchaseModal({ open: false })
      await load()
    } finally { setSaving(false) }
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const lowItems = items.filter(i => i.status !== 'good')

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Stock"
        subtitle="Manage raw materials & purchases"
        action={
          <Button onClick={openAddItem} className="gradient-brand border-0 text-white gap-2">
            <Plus size={16} /> Add Item
          </Button>
        }
      />

      {/* Low stock alert */}
      {lowItems.length > 0 && (
        <div className="rounded-xl p-4 bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-rose-400 font-semibold text-sm">Low Stock Alert</p>
            <p className="text-rose-300/80 text-xs">
              {lowItems.map(i => `${i.name} (${unitLabel(i.unit, i.current_quantity)})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Items', value: items.length, color: 'text-primary' },
          { label: 'Low / Out', value: lowItems.length, color: 'text-rose-400' },
          { label: 'Healthy', value: items.filter(i => i.status === 'good').length, color: 'text-emerald-400' },
        ].map(card => (
          <div key={card.label} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-display ${card.color}`}>{card.value}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search stock items..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-secondary/50"
      />

      {/* Items list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No stock items yet"
          description="Add your raw materials like chocolate compound, packaging boxes, dry fruits, etc."
          action={<Button onClick={openAddItem} className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> Add First Item</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="glass rounded-xl border border-border overflow-hidden">
              {/* Item row */}
              <div className="flex items-center gap-3 p-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === 'out' ? 'bg-rose-500/15' :
                    item.status === 'low' ? 'bg-amber-500/15' :
                    'bg-emerald-500/15'
                  }`}
                >
                  <Package size={18} className={
                    item.status === 'out' ? 'text-rose-400' :
                    item.status === 'low' ? 'text-amber-400' :
                    'text-emerald-400'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-sm">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground text-xs">
                      {unitLabel(item.unit, item.current_quantity)}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <StockBadge status={item.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPurchaseModal({ open: true, item })}
                    className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                    title="Add Purchase"
                  >
                    <ShoppingCart size={14} />
                  </button>
                  <button
                    onClick={() => openEditItem(item)}
                    className="w-8 h-8 rounded-lg glass text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="w-8 h-8 rounded-lg glass text-muted-foreground flex items-center justify-center hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-8 h-8 rounded-lg glass text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                  >
                    {expandedId === item.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
              </div>

              {/* Threshold bar */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Stock Level</span>
                  <span>Threshold: {unitLabel(item.unit, item.low_stock_threshold)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.status === 'out' ? 'bg-rose-500' :
                      item.status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, item.low_stock_threshold > 0
                        ? (item.current_quantity / (item.low_stock_threshold * 2)) * 100
                        : 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              {/* Purchase history */}
              {expandedId === item.id && (
                <div className="border-t border-border px-4 py-3 bg-secondary/30">
                  <SectionHeader title="Purchase History" className="mb-2" />
                  {(purchases[item.id] ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">No purchases recorded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {(purchases[item.id] ?? []).map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(p.purchased_at), 'dd MMM yyyy')}
                          </span>
                          <span className="text-foreground text-xs">
                            {unitLabel(item.unit, p.quantity_purchased)}
                          </span>
                          <Currency amount={p.total_cost} className="text-xs text-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Item Modal ─────────────────────────── */}
      {itemModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold font-display mb-5">
              {itemModal.editing ? 'Edit Stock Item' : 'Add Stock Item'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Item Name</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Dark Chocolate Compound" className="mt-1 bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-sm">Unit</Label>
                  <select
                    value={formUnit} onChange={e => setFormUnit(e.target.value as StockUnit)}
                    className="mt-1 w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Current Qty</Label>
                  <Input type="number" value={formQty} onChange={e => setFormQty(e.target.value)}
                    className="mt-1 bg-secondary/50" />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Low Stock Alert At</Label>
                <Input type="number" value={formThreshold} onChange={e => setFormThreshold(e.target.value)}
                  className="mt-1 bg-secondary/50"
                  placeholder={`e.g. 100 ${formUnit === 'piece' ? 'pcs' : formUnit}`} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setItemModal({ open: false })} className="flex-1">Cancel</Button>
              <Button onClick={saveItem} disabled={saving || !formName.trim()} className="flex-1 gradient-brand border-0 text-white">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Purchase Modal ───────────────────────────── */}
      {purchaseModal.open && purchaseModal.item && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold font-display mb-1">Record Purchase</h2>
            <p className="text-muted-foreground text-sm mb-5">{purchaseModal.item.name}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-sm">Quantity Bought ({purchaseModal.item.unit})</Label>
                  <Input type="number" value={pQty} onChange={e => setPQty(e.target.value)}
                    placeholder="e.g. 500" className="mt-1 bg-secondary/50" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Total Cost (₹)</Label>
                  <Input type="number" value={pCost} onChange={e => setPCost(e.target.value)}
                    placeholder="e.g. 160" className="mt-1 bg-secondary/50" />
                </div>
              </div>
              {pQty && pCost && (
                <div className="glass rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Cost per {purchaseModal.item.unit}: </span>
                  <span className="text-foreground font-semibold">
                    ₹{(parseFloat(pCost) / parseFloat(pQty)).toFixed(2)}
                  </span>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-sm">Purchase Date</Label>
                <Input type="date" value={pDate} onChange={e => setPDate(e.target.value)} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Notes (optional)</Label>
                <Input value={pNotes} onChange={e => setPNotes(e.target.value)}
                  placeholder="Supplier, location, etc." className="mt-1 bg-secondary/50" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setPurchaseModal({ open: false })} className="flex-1">Cancel</Button>
              <Button onClick={savePurchase} disabled={saving || !pQty || !pCost} className="flex-1 gradient-brand border-0 text-white">
                {saving ? 'Saving...' : 'Add Purchase'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm p-6 text-center animate-slide-up">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold mb-2">Delete Stock Item?</h3>
            <p className="text-muted-foreground text-sm mb-6">This will also remove all purchase records for this item.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => deleteItem(deleteConfirm)} disabled={saving}
                className="flex-1 bg-destructive text-white border-0">
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

