import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, LoadingSpinner } from '@/components/shared/Layout'
import { StatusBadge, PaymentBadge, Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { fetchOrder, updateOrderStatus, updateOrder } from '@/services/orderService'
import type { OrderWithDetails, PaymentMethod, OrderStatus } from '@/lib/database.types'
import { format } from 'date-fns'
import { Printer, Truck, CheckCircle, Clock, Trash2, Pencil, Phone, MapPin } from 'lucide-react'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [printMode, setPrintMode] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchOrder(id).then(o => { setOrder(o); setLoading(false) })
  }, [id])

  const advance = async () => {
    if (!order) return
    setSaving(true)
    if (order.status === 'pending') {
      await updateOrderStatus(order.id, 'delivered')
      setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev)
    } else if (order.status === 'delivered') {
      setPayModal(true)
    }
    setSaving(false)
  }

  const confirmPay = async () => {
    if (!order) return
    setSaving(true)
    await updateOrderStatus(order.id, 'paid', payMethod)
    setOrder(prev => prev ? { ...prev, status: 'paid', payment_method: payMethod } : prev)
    setPayModal(false)
    setSaving(false)
  }

  const handlePrint = () => {
    setPrintMode(true)
    setTimeout(() => { window.print(); setPrintMode(false) }, 300)
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  if (!order) return <div className="text-center py-16 text-muted-foreground">Order not found</div>

  const BillContent = () => (
    <div className={`${printMode ? 'print-bill' : ''}`}>
      {/* Bill header */}
      <div className="glass rounded-2xl p-6 border border-border mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🍫 Ek Aur Bite
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Homemade Chocolates & Sweets</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Invoice</p>
            <p className="text-foreground font-bold text-lg">#{order.order_number}</p>
            <p className="text-muted-foreground text-xs">{format(new Date(order.ordered_at), 'dd MMM yyyy')}</p>
          </div>
        </div>

        {/* Customer */}
        {(order.customer_name || order.customer_phone) && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Bill To</p>
            {order.customer_name && <p className="text-foreground font-semibold">{order.customer_name}</p>}
            {order.customer_phone && (
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                <Phone size={11} /> {order.customer_phone}
              </p>
            )}
            {order.customer_address && (
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {order.customer_address}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="glass rounded-2xl border border-border overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-muted-foreground font-medium">Item</th>
              <th className="text-center p-4 text-muted-foreground font-medium">Qty</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Price</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} className={i < order.items.length - 1 ? 'border-b border-border/50' : ''}>
                <td className="p-4">
                  <p className="text-foreground font-medium">{item.product_name}</p>
                  {item.notes && <p className="text-muted-foreground text-xs">{item.notes}</p>}
                </td>
                <td className="p-4 text-center text-muted-foreground">{item.quantity}</td>
                <td className="p-4 text-right text-muted-foreground">₹{item.selling_price}</td>
                <td className="p-4 text-right text-foreground font-semibold">
                  <Currency amount={item.selling_price * item.quantity} />
                </td>
              </tr>
            ))}
            {/* Extras revenue */}
            {order.extras.filter(e => e.type === 'revenue').map(extra => (
              <tr key={extra.id} className="border-t border-border/50">
                <td className="p-4 col-span-2 text-muted-foreground italic text-xs">{extra.description}</td>
                <td></td>
                <td></td>
                <td className="p-4 text-right text-muted-foreground"><Currency amount={extra.amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="border-t border-border p-4 space-y-2">
          {order.extras.filter(e => e.type === 'revenue').length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <Currency amount={order.items.reduce((s, i) => s + i.selling_price * i.quantity, 0)} />
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span className="text-foreground">Total</span>
            <span className="text-primary"><Currency amount={order.total_selling} /></span>
          </div>
          {order.status === 'paid' && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={14} />
              Paid via {order.payment_method === 'cash' ? 'Cash 💵' : 'Online 📱'}
              {order.paid_at && ` on ${format(new Date(order.paid_at), 'dd MMM yyyy')}`}
            </div>
          )}
        </div>
      </div>

      {/* Internal profit info (only visible in app, hidden on print) */}
      {!printMode && (
        <div className="glass rounded-2xl p-4 border border-border mb-4 no-print">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Internal Summary</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-muted-foreground text-xs">Total Cost</p>
              <p className="text-foreground font-semibold"><Currency amount={order.total_cost} /></p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Revenue</p>
              <p className="text-foreground font-semibold"><Currency amount={order.total_selling} /></p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Profit</p>
              <p className={`font-bold ${order.total_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {order.total_profit >= 0 ? '+' : ''}<Currency amount={order.total_profit} />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bill footer */}
      <div className="text-center text-muted-foreground text-xs py-3">
        <p>Thank you for your order! 🍫</p>
        <p className="mt-0.5">Made with love by Ek Aur Bite</p>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={`Order #${order.order_number}`}
        subtitle={order.customer_name ?? 'Walk-in Customer'}
        back={() => navigate('/orders')}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer size={14} /> Print Bill
            </Button>
            {order.status !== 'paid' && (
              <Button
                size="sm"
                onClick={advance}
                disabled={saving}
                className="gradient-brand border-0 text-white gap-1.5"
              >
                {order.status === 'pending' ? (
                  <><Truck size={14} /> Mark Delivered</>
                ) : (
                  <><CheckCircle size={14} /> Mark Paid</>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* Status pills */}
      <div className="flex gap-2">
        <StatusBadge status={order.status} />
        {order.payment_method && <PaymentBadge method={order.payment_method} />}
      </div>

      {/* Timeline */}
      <div className="glass rounded-xl p-4 border border-border">
        <div className="flex items-center gap-0">
          {[
            { label: 'Ordered', date: order.ordered_at, done: true, icon: Clock },
            { label: 'Delivered', date: order.delivered_at, done: !!order.delivered_at, icon: Truck },
            { label: 'Paid', date: order.paid_at, done: !!order.paid_at, icon: CheckCircle },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                  <step.icon size={14} />
                </div>
                <p className="text-xs mt-1 font-medium text-center" style={{ color: step.done ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-muted-foreground text-xs text-center">
                    {format(new Date(step.date), 'dd MMM')}
                  </p>
                )}
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-6 ${step.done && arr[i + 1].done ? 'bg-primary' : 'bg-secondary'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bill */}
      <BillContent />

      {/* Notes */}
      {order.notes && (
        <div className="glass rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs uppercase mb-1">Notes</p>
          <p className="text-foreground text-sm">{order.notes}</p>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payModal && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-1">Mark as Paid</h3>
            <p className="text-muted-foreground text-sm mb-4">Order #{order.order_number} · <Currency amount={order.total_selling} /></p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(['cash', 'online'] as PaymentMethod[]).map(m => (
                <button key={m!} onClick={() => setPayMethod(m)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${payMethod === m ? 'gradient-brand text-white' : 'glass text-muted-foreground hover:text-foreground'}`}>
                  {m === 'cash' ? '💵 Cash' : '📱 Online'}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPayModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmPay} disabled={saving} className="flex-1 gradient-brand border-0 text-white">
                {saving ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

