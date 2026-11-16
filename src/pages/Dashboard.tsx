import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, StatCard, LowStockAlertBanner, SectionHeader, LoadingSpinner } from '@/components/shared/Layout'
import { Currency, StatusBadge, StockBadge } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { TrendingUp, ShoppingBag, Package, Users, Plus, ChevronRight, DollarSign, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '@/services/orderService'
import { fetchStockItems } from '@/services/stockService'
import { fetchProducts } from '@/services/productService'
import { fetchCustomers } from '@/services/customerService'
import type { OrderWithDetails, StockItemWithStatus, ProductWithIngredients, CustomerWithStats } from '@/lib/database.types'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [stock, setStock] = useState<StockItemWithStatus[]>([])
  const [products, setProducts] = useState<ProductWithIngredients[]>([])
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [o, s, p, c] = await Promise.all([
        fetchOrders(user.id),
        fetchStockItems(user.id),
        fetchProducts(user.id),
        fetchCustomers(user.id),
      ])
      setOrders(o)
      setStock(s)
      setProducts(p)
      setCustomers(c)
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { void load() }, [load])

  // Computed stats
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const todayOrders = orders.filter(o => o.ordered_at >= todayStart && o.ordered_at <= todayEnd)
  const monthOrders = orders.filter(o => o.ordered_at >= monthStart && o.ordered_at <= monthEnd)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const recentOrders = orders.slice(0, 5)

  const todayRevenue = todayOrders.reduce((s, o) => s + o.total_selling, 0)
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total_selling, 0)
  const monthProfit  = monthOrders.reduce((s, o) => s + o.total_profit, 0)

  const lowStock = stock.filter(s => s.status === 'low' || s.status === 'out')

  // Greeting
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🍫</div>
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting}! Here's your business overview 🍫`}
        action={
          <Link to="/orders/new">
            <Button className="gradient-brand border-0 text-white gap-2">
              <Plus size={16} /> New Order
            </Button>
          </Link>
        }
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <LowStockAlertBanner
          items={lowStock.map(s => `${s.name} (${s.current_quantity}${s.unit === 'gram' ? 'g' : s.unit === 'kg' ? 'kg' : s.unit === 'ml' ? 'ml' : s.unit === 'litre' ? 'L' : ' pcs'} left)`)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Today's Revenue"
          value={<Currency amount={todayRevenue} />}
          subtitle={`${todayOrders.length} order${todayOrders.length !== 1 ? 's' : ''}`}
          icon={<TrendingUp size={18} />}
          accentColor="#10B981"
        />
        <StatCard
          title="Pending Orders"
          value={String(pendingOrders.length)}
          subtitle={pendingOrders.length > 0 ? 'Needs attention' : 'All clear ✅'}
          icon={<ShoppingBag size={18} />}
          accentColor="#F59E0B"
        />
        <StatCard
          title="This Month"
          value={<Currency amount={monthRevenue} />}
          subtitle={`Profit: ₹${monthProfit.toLocaleString('en-IN')}`}
          icon={<DollarSign size={18} />}
          accentColor="#7C3AED"
        />
        <StatCard
          title="Customers"
          value={String(customers.length)}
          subtitle="Total active"
          icon={<Users size={18} />}
          accentColor="#0EA5E9"
        />
      </div>

      {/* Stock Snapshot */}
      <SectionHeader
        title="Stock Snapshot"
        subtitle={lowStock.length > 0 ? `⚠️ ${lowStock.length} items low` : 'All items in stock'}
        action={<Link to="/stock" className="text-primary text-sm font-medium hover:underline">View all</Link>}
      />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {stock.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center w-full">
            <Package size={24} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-muted-foreground text-sm">No stock items yet</p>
            <Link to="/stock" className="text-primary text-xs hover:underline">Add stock →</Link>
          </div>
        ) : (
          stock.slice(0, 8).map(item => (
            <Link key={item.id} to="/stock">
              <div className={`glass rounded-xl p-4 min-w-[120px] card-hover border ${
                item.status === 'out' ? 'border-rose-500/30' :
                item.status === 'low' ? 'border-amber-500/30' :
                'border-border'
              }`}>
                <Package size={20} className={
                  item.status === 'out' ? 'text-rose-400' :
                  item.status === 'low' ? 'text-amber-400 animate-pulse' :
                  'text-emerald-400'
                } />
                <p className="text-foreground font-medium text-sm mt-2 leading-tight truncate">{item.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {item.current_quantity}{item.unit === 'gram' ? 'g' : item.unit === 'kg' ? 'kg' : item.unit === 'ml' ? 'ml' : item.unit === 'litre' ? 'L' : ' pcs'}
                </p>
                <StockBadge status={item.status} className="mt-1" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Products Grid */}
      <SectionHeader
        title="Products"
        subtitle="Quick start an order"
        action={<Link to="/products" className="text-primary text-sm font-medium hover:underline">Manage</Link>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {products.slice(0, 6).map(product => (
          <Link key={product.id} to={`/orders/new?product=${product.id}`}>
            <div className="glass rounded-xl p-4 card-hover border border-border hover:border-primary/40 transition-colors">
              {product.photo_url ? (
                <img src={product.photo_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover mb-2" />
              ) : (
                <div className="text-3xl mb-2">🍫</div>
              )}
              <p className="text-foreground font-semibold text-sm truncate">{product.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">₹{product.default_selling_price}</p>
              <div className="mt-3 text-primary text-xs font-medium flex items-center gap-1">
                Order <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        ))}
        {products.length === 0 && (
          <Link to="/products">
            <div className="glass rounded-xl p-4 card-hover border border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center min-h-[120px] text-muted-foreground hover:text-primary">
              <Plus size={24} />
              <p className="text-xs font-medium mt-1">Add Product</p>
            </div>
          </Link>
        )}
      </div>

      {/* Recent Orders */}
      <SectionHeader
        title="Recent Orders"
        action={<Link to="/orders" className="text-primary text-sm font-medium hover:underline">View all</Link>}
      />
      {recentOrders.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center mb-4">
          <ShoppingBag size={28} className="mx-auto text-muted-foreground mb-2 opacity-40" />
          <p className="text-muted-foreground text-sm">No orders yet — create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentOrders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`}>
              <div className="glass rounded-xl p-4 card-hover border border-border flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                  #{order.order_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm truncate">
                    {order.customer_name || 'Walk-in Customer'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {format(new Date(order.ordered_at), 'dd MMM')} · Profit: <span className={order.total_profit >= 0 ? 'text-profit' : 'text-loss'}>
                      {order.total_profit >= 0 ? '+' : ''}₹{Math.abs(order.total_profit).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-foreground font-semibold text-sm"><Currency amount={order.total_selling} /></p>
                  <StatusBadge status={order.status} className="mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
