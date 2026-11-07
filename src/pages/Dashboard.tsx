import { PageHeader, StatCard, LowStockAlertBanner, SectionHeader } from '@/components/shared/Layout'
import { Currency, StatusBadge } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { TrendingUp, ShoppingBag, Package, Users, Plus, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Good morning! Here's your business overview 🍫"
        action={
          <Link to="/orders/new">
            <Button className="gradient-brand border-0 text-white gap-2">
              <Plus size={16} /> New Order
            </Button>
          </Link>
        }
      />

      {/* Low stock alert */}
      <LowStockAlertBanner items={['Dark Chocolate (50g left)', 'Packaging Box (2 left)']} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Today's Revenue"
          value={<Currency amount={1200} />}
          subtitle="3 orders"
          icon={<TrendingUp size={18} />}
          accentColor="#10B981"
          trend={{ value: 12, label: 'vs yesterday' }}
        />
        <StatCard
          title="Pending Orders"
          value="3"
          subtitle="Needs attention"
          icon={<ShoppingBag size={18} />}
          accentColor="#F59E0B"
        />
        <StatCard
          title="This Month"
          value={<Currency amount={18400} />}
          subtitle="Profit: ₹4,500"
          icon={<TrendingUp size={18} />}
          accentColor="#7C3AED"
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatCard
          title="Customers"
          value="24"
          subtitle="Total active"
          icon={<Users size={18} />}
          accentColor="#0EA5E9"
        />
      </div>

      {/* Stock Snapshot */}
      <SectionHeader
        title="Stock Snapshot"
        subtitle="Swipe to see all items"
        action={<Link to="/stock" className="text-primary text-sm font-medium hover:underline">View all</Link>}
      />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {[
          { name: 'Dark Choc', qty: '50g', unit: 'gram', status: 'low' as const },
          { name: 'Milk Choc', qty: '800g', unit: 'gram', status: 'good' as const },
          { name: 'Box', qty: '2 pcs', unit: 'piece', status: 'out' as const },
          { name: 'Dry Fruit', qty: '150g', unit: 'gram', status: 'good' as const },
          { name: 'White Choc', qty: '300g', unit: 'gram', status: 'good' as const },
        ].map(item => (
          <Link key={item.name} to="/stock">
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
              <p className="text-foreground font-medium text-sm mt-2 leading-tight">{item.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{item.qty}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Products Grid */}
      <SectionHeader
        title="Products"
        subtitle="Quick start an order"
        action={<Link to="/products" className="text-primary text-sm font-medium hover:underline">Manage</Link>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {[
          { name: 'Choco Turffi', price: 200, emoji: '🍫' },
          { name: 'Baraka', price: 150, emoji: '🍬' },
          { name: 'Dark Truffle', price: 180, emoji: '🟤' },
        ].map(product => (
          <Link key={product.name} to="/orders/new">
            <div className="glass rounded-xl p-4 card-hover border border-border hover:border-primary/40 transition-colors">
              <div className="text-3xl mb-2">{product.emoji}</div>
              <p className="text-foreground font-semibold text-sm">{product.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">₹{product.price}</p>
              <div className="mt-3 text-primary text-xs font-medium flex items-center gap-1">
                Order <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        ))}
        <Link to="/products/new">
          <div className="glass rounded-xl p-4 card-hover border border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center min-h-[120px] text-muted-foreground hover:text-primary">
            <Plus size={24} />
            <p className="text-xs font-medium mt-1">Add Product</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <SectionHeader
        title="Recent Orders"
        action={<Link to="/orders" className="text-primary text-sm font-medium hover:underline">View all</Link>}
      />
      <div className="space-y-2">
        {[
          { id: '001', customer: 'Rahul Sharma', total: 550, profit: 90, status: 'paid' as const },
          { id: '002', customer: 'Priya Singh', total: 320, profit: 60, status: 'delivered' as const },
          { id: '003', customer: 'Ahmed Khan', total: 780, profit: 140, status: 'pending' as const },
        ].map(order => (
          <Link key={order.id} to={`/orders/${order.id}`}>
            <div className="glass rounded-xl p-4 card-hover border border-border flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                #{order.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium text-sm truncate">{order.customer}</p>
                <p className="text-muted-foreground text-xs">Profit: <span className="text-profit">+₹{order.profit}</span></p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-foreground font-semibold text-sm">₹{order.total}</p>
                <StatusBadge status={order.status} className="mt-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
