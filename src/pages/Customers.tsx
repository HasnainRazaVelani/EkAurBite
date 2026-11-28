import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/shared/Layout'
import { Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/services/customerService'
import { fetchOrders } from '@/services/orderService'
import type { CustomerWithStats, OrderWithDetails } from '@/lib/database.types'
import { Users, Plus, Pencil, Trash2, Phone, MapPin, ShoppingBag, TrendingUp, ChevronRight, Search } from 'lucide-react'
import { format } from 'date-fns'
import { StatusBadge } from '@/components/shared/Badges'

export default function CustomersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null)
  const [customerOrders, setCustomerOrders] = useState<OrderWithDetails[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: CustomerWithStats }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fAddress, setFAddress] = useState('')
  const [fNotes, setFNotes] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try { setCustomers(await fetchCustomers(user.id)) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  const viewCustomer = async (c: CustomerWithStats) => {
    setSelectedCustomer(c)
    setLoadingOrders(true)
    try { setCustomerOrders(await fetchOrders(user!.id, { customer_id: c.id })) }
    finally { setLoadingOrders(false) }
  }

  const openAdd = () => {
    setFName(''); setFPhone(''); setFAddress(''); setFNotes('')
    setModal({ open: true })
  }

  const openEdit = (c: CustomerWithStats) => {
    setFName(c.name); setFPhone(c.phone ?? ''); setFAddress(c.address ?? ''); setFNotes(c.notes ?? '')
    setModal({ open: true, editing: c })
  }

  const save = async () => {
    if (!user || !fName.trim()) return
    setSaving(true)
    try {
      const payload = { name: fName.trim(), phone: fPhone || undefined, address: fAddress || undefined, notes: fNotes || undefined }
      if (modal.editing) await updateCustomer(modal.editing.id, payload)
      else await createCustomer(user.id, payload)
      setModal({ open: false })
      await load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    try { await deleteCustomer(id); setDeleteConfirm(null); setSelectedCustomer(null); await load() }
    finally { setSaving(false) }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  ).sort((a, b) => b.total_spent - a.total_spent)

  // ── Customer Detail Panel ──────────────────────────
  if (selectedCustomer) {
    return (
      <div className="animate-fade-in space-y-5">
        <PageHeader
          title={selectedCustomer.name}
          subtitle="Customer details & order history"
          back={() => setSelectedCustomer(null)}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(selectedCustomer)}>
                <Pencil size={14} />
              </Button>
              <Button size="sm" onClick={() => navigate(`/orders/new?customer=${selectedCustomer.id}`)}
                className="gradient-brand border-0 text-white gap-2">
                <Plus size={14} /> New Order
              </Button>
            </div>
          }
        />

        {/* Customer info */}
        <div className="glass rounded-2xl p-5 border border-border space-y-2">
          {selectedCustomer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground" />
              <span className="text-foreground">{selectedCustomer.phone}</span>
            </div>
          )}
          {selectedCustomer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-muted-foreground" />
              <span className="text-foreground">{selectedCustomer.address}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xl font-bold font-display text-primary">{selectedCustomer.total_orders}</p>
            <p className="text-muted-foreground text-xs">Orders</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xl font-bold font-display text-emerald-400"><Currency amount={selectedCustomer.total_spent} /></p>
            <p className="text-muted-foreground text-xs">Total Spent</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xl font-bold font-display text-foreground">
              {selectedCustomer.last_order_date
                ? format(new Date(selectedCustomer.last_order_date), 'dd MMM')
                : '—'}
            </p>
            <p className="text-muted-foreground text-xs">Last Order</p>
          </div>
        </div>

        {/* Orders */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Order History</h3>
          {loadingOrders ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : customerOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No orders yet</div>
          ) : (
            <div className="space-y-2">
              {customerOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="w-full glass rounded-xl p-4 border border-border flex items-center gap-3 card-hover text-left"
                >
                  <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                    #{o.order_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium">{format(new Date(o.ordered_at), 'dd MMM yyyy')}</p>
                    <p className="text-muted-foreground text-xs">{o.items.length} items</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-foreground font-bold text-sm"><Currency amount={o.total_selling} /></p>
                    <StatusBadge status={o.status} className="mt-0.5" />
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Customer List ──────────────────────────────────
  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers total`}
        action={
          <Button onClick={openAdd} className="gradient-brand border-0 text-white gap-2">
            <Plus size={16} /> Add Customer
          </Button>
        }
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{customers.length}</p>
          <p className="text-muted-foreground text-xs">Total Customers</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-display text-emerald-400">
            <Currency amount={customers.reduce((s, c) => s + c.total_spent, 0)} />
          </p>
          <p className="text-muted-foreground text-xs">Total Revenue</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-secondary/50" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No customers yet"
          description="Add your regular customers to track orders and spending."
          action={<Button onClick={openAdd} className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> Add Customer</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="glass rounded-xl border border-border flex items-center gap-3 p-4 card-hover">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <button className="flex-1 min-w-0 text-left" onClick={() => viewCustomer(c)}>
                <p className="text-foreground font-semibold text-sm">{c.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.phone && <span className="text-muted-foreground text-xs flex items-center gap-1"><Phone size={9} /> {c.phone}</span>}
                  {c.address && <span className="text-muted-foreground text-xs truncate flex items-center gap-1"><MapPin size={9} /> {c.address}</span>}
                </div>
              </button>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <ShoppingBag size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{c.total_orders}</span>
                </div>
                <p className="text-emerald-400 text-sm font-semibold"><Currency amount={c.total_spent} /></p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Pencil size={12} />
                </button>
                <button onClick={() => setDeleteConfirm(c.id)} className="w-7 h-7 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-rose-400">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold font-display mb-5">{modal.editing ? 'Edit Customer' : 'Add Customer'}</h2>
            <div className="space-y-4">
              <div><Label className="text-muted-foreground text-sm">Name *</Label><Input value={fName} onChange={e => setFName(e.target.value)} placeholder="Customer name" className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-muted-foreground text-sm">Phone</Label><Input value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="Phone number" className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-muted-foreground text-sm">Address</Label><Input value={fAddress} onChange={e => setFAddress(e.target.value)} placeholder="Delivery address" className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-muted-foreground text-sm">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Any notes..." className="mt-1 bg-secondary/50" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setModal({ open: false })} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving || !fName.trim()} className="flex-1 gradient-brand border-0 text-white">{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm p-6 text-center animate-slide-up">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold mb-2">Delete Customer?</h3>
            <p className="text-muted-foreground text-sm mb-6">Their orders will remain but won't be linked to a customer.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="flex-1 bg-destructive text-white border-0">{saving ? 'Deleting...' : 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

