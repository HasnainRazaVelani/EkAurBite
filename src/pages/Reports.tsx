import { useState, useEffect, useCallback } from 'react'
import { Portal } from '@/components/shared/Portal'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, LoadingSpinner } from '@/components/shared/Layout'
import { Currency } from '@/components/shared/Badges'
import { fetchMonthlyReport } from '@/services/orderService'
import { fetchOrders } from '@/services/orderService'
import type { OrderWithDetails } from '@/lib/database.types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Calendar } from 'lucide-react'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const COLORS = ['#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444']

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-border text-sm shadow-xl">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-foreground font-medium">₹{p.value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuth()
  const year = new Date().getFullYear()
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly')
  const [monthlyData, setMonthlyData] = useState<{
    month: number; name: string; revenue: number; cost: number; profit: number; count: number
  }[]>([])
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [monthly, allOrders] = await Promise.all([
        fetchMonthlyReport(user.id, year),
        fetchOrders(user.id),
      ])
      setMonthlyData(monthly)
      setOrders(allOrders)
    } finally { setLoading(false) }
  }, [user, year])

  useEffect(() => { void load() }, [load])

  // Quarterly aggregation
  const quarterlyData = [1, 2, 3, 4].map(q => {
    const months = monthlyData.filter(m => Math.ceil(m.month / 3) === q)
    return {
      name: `Q${q}`,
      revenue: months.reduce((s, m) => s + m.revenue, 0),
      cost: months.reduce((s, m) => s + m.cost, 0),
      profit: months.reduce((s, m) => s + m.profit, 0),
      count: months.reduce((s, m) => s + m.count, 0),
    }
  })

  const chartData = period === 'monthly' ? monthlyData.map(m => ({ ...m, name: m.name })) : quarterlyData

  // Top products
  const productTotals: Record<string, { name: string; revenue: number; count: number }> = {}
  for (const order of orders) {
    for (const item of order.items) {
      if (!productTotals[item.product_name]) {
        productTotals[item.product_name] = { name: item.product_name, revenue: 0, count: 0 }
      }
      productTotals[item.product_name].revenue += item.selling_price * item.quantity
      productTotals[item.product_name].count += item.quantity
    }
  }
  const topProducts = Object.values(productTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 6)

  // Status breakdown
  const paidOrders      = orders.filter(o => o.status === 'paid')
  const pendingOrders   = orders.filter(o => o.status === 'pending')
  const deliveredOrders = orders.filter(o => o.status === 'delivered')

  // Payment method breakdown
  const cashOrders   = paidOrders.filter(o => o.payment_method === 'cash')
  const onlineOrders = paidOrders.filter(o => o.payment_method === 'online')
  const paymentPie = [
    { name: 'Cash', value: cashOrders.reduce((s, o) => s + o.total_selling, 0) },
    { name: 'Online', value: onlineOrders.reduce((s, o) => s + o.total_selling, 0) },
  ].filter(d => d.value > 0)

  // All-time totals
  const totalRevenue = orders.reduce((s, o) => s + o.total_selling, 0)
  const totalProfit  = orders.reduce((s, o) => s + o.total_profit, 0)
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  if (loading) return (
    <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Reports" subtitle={`Financial analytics for ${year}`} />

      {/* All-time KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: <Currency amount={totalRevenue} />, icon: DollarSign, color: 'text-primary' },
          { label: 'Total Profit', value: <Currency amount={totalProfit} />, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, icon: TrendingUp, color: profitMargin >= 20 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-foreground' },
        ].map(card => (
          <div key={card.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <card.icon size={14} className="text-muted-foreground" />
              <p className="text-muted-foreground text-xs">{card.label}</p>
            </div>
            <p className={`text-xl font-bold font-display ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Period toggle */}
      <div className="flex gap-2">
        {(['monthly', 'quarterly'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              period === p ? 'gradient-brand text-white' : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'monthly' ? '📅 Monthly' : '📊 Quarterly'}
          </button>
        ))}
      </div>

      {/* Revenue & Profit Chart */}
      <div className="glass rounded-2xl p-5 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Revenue vs Profit</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
            <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit"  name="Profit"  fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders trend */}
      <div className="glass rounded-2xl p-5 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Order Count Trend</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(20,20,30,0.9)', border: '1px solid #333', borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="count" name="Orders" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products + Payment Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="glass rounded-2xl p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-4">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-foreground text-sm truncate">{p.name}</p>
                      <span className="text-emerald-400 text-sm font-medium ml-2"><Currency amount={p.revenue} /></span>
                    </div>
                    <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Split */}
        <div className="glass rounded-2xl p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-4">Payment Method Split</h3>
          {paymentPie.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No paid orders yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {paymentPie.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#8b5cf6' : '#ec4899'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {paymentPie.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ background: i === 0 ? '#8b5cf6' : '#ec4899' }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <p className="text-foreground font-semibold ml-5"><Currency amount={p.value} /></p>
                    <p className="text-muted-foreground text-xs ml-5">
                      {((p.value / totalRevenue) * 100).toFixed(0)}% of revenue
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order status breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border">
            {[
              { label: 'Pending', count: pendingOrders.length, color: 'text-amber-400' },
              { label: 'Delivered', count: deliveredOrders.length, color: 'text-blue-400' },
              { label: 'Paid', count: paidOrders.length, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold font-display ${s.color}`}>{s.count}</p>
                <p className="text-muted-foreground text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


