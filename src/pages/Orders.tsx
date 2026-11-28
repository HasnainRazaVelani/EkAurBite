import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/shared/Layout'
import { StatusBadge, PaymentBadge, ProfitDisplay, Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchOrders, updateOrderStatus, deleteOrder } from '@/services/orderService'
import type { OrderWithDetails, OrderStatus, PaymentMethod } from '@/lib/database.types'
import { Plus, Search, ChevronRight, Trash2, TrendingUp, ShoppingBag, Clock } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '⏳ Pending', value: 'pending' },
  { label: '📦 Delivered', value: 'delivered' },
  { label: '✅ Paid', value: 'paid' },
]

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statusModal, setStatusModal] = useState<{ order: OrderWithDetails } | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try { setOrders(await fetchOrders(user.id)) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.order_number).includes(search)
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalRevenue = filtered.reduce((s, o) => s + o.total_selling, 0)
  const totalProfit  = filtered.reduce((s, o) => s + o.total_profit, 0)

  const advanceStatus = async (order: OrderWithDetails) => {
    if (order.status === 'pending') {
      setSaving(true)
      await updateOrderStatus(order.id, 'delivered')
      setSaving(false)
      await load()
    } else if (order.status === 'delivered') {
      setStatusModal({ order })
    }
  }

  const markPaid = async () => {
    if (!statusModal) return
    setSaving(true)
    await updateOrderStatus(statusModal.order.id, 'paid', payMethod)
    setStatusModal(null)
    setSaving(false)
    await load()
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    await deleteOrder(id)
    setDeleteConfirm(null)
    setSaving(false)
    await load()
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Orders"
        subtitle="Manage and track customer orders"
        action={
          <Link to="/orders/new">
            <Button className="gradient-brand border-0 text-white gap-2">
              <Plus size={16} /> New Order
            </Button>
          </Link>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold font-display text-primary">{filtered.length}</p>
          <p className="text-muted-foreground text-xs">Orders</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold font-display text-foreground"><Currency amount={totalRevenue} /></p>
          <p className="text-muted-foreground text-xs">Revenue</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold font-display text-emerald-400"><Currency amount={totalProfit} /></p>
          <p className="text-muted-foreground text-xs">Profit</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === f.value
                ? 'bg-primary text-white'
                : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Search by customer or order #..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-secondary/50"
        />
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No orders yet"
          description="Create your first order and start tracking your chocolate business!"
          action={
            <Link to="/orders/new">
              <Button className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> New Order</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <div key={order.id} className="glass rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                {/* Order number */}
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                  #{order.order_number}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-semibold text-sm">
                      {order.customer_name || 'Walk-in Customer'}
                    </p>
                    <StatusBadge status={order.status} />
                    {order.payment_method && <PaymentBadge method={order.payment_method} />}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    <Clock size={10} className="inline mr-1" />
                    {format(new Date(order.ordered_at), 'dd MMM yyyy, hh:mm a')}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    {order.items.slice(0, 2).map(i => ` · ${i.product_name}`)}
                    {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                  </p>
                </div>

                {/* Amount + actions */}
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-foreground font-bold"><Currency amount={order.total_selling} /></p>
                  <ProfitDisplay profit={order.total_profit} className="text-xs" />
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-border flex divide-x divide-border">
                {order.status !== 'paid' && (
                  <button
                    onClick={() => advanceStatus(order)}
                    disabled={saving}
                    className="flex-1 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    {order.status === 'pending' ? '📦 Mark Delivered' : '✅ Mark Paid'}
                  </button>
                )}
                <Link to={`/orders/${order.id}`} className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                  View / Bill <ChevronRight size={12} />
                </Link>
                <button
                  onClick={() => setDeleteConfirm(order.id)}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark Paid Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="modal-glass rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-1">Mark as Paid</h3>
            <p className="text-muted-foreground text-sm mb-4">Order #{statusModal.order.order_number} · <Currency amount={statusModal.order.total_selling} /></p>
            <div>
              <p className="text-muted-foreground text-sm mb-2">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'online'] as PaymentMethod[]).map(method => (
                  <button
                    key={method!}
                    onClick={() => setPayMethod(method)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      payMethod === method
                        ? 'gradient-brand text-white'
                        : 'glass text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {method === 'cash' ? '💵 Cash' : '📱 Online'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={() => setStatusModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={markPaid} disabled={saving} className="flex-1 gradient-brand border-0 text-white">
                {saving ? 'Saving...' : 'Confirm Payment'}
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
            <h3 className="text-lg font-bold mb-2">Delete Order?</h3>
            <p className="text-muted-foreground text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="flex-1 bg-destructive text-white border-0">
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


