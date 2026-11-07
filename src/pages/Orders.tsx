import { PageHeader } from '@/components/shared/Layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Orders"
        subtitle="Manage customer orders"
        action={<Button className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> New Order</Button>}
      />
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        <div className="text-5xl mb-4">🛒</div>
        <p className="text-lg font-semibold text-foreground">Orders module coming soon...</p>
        <p className="text-sm mt-1">Create, manage, and track orders with profit calculation.</p>
      </div>
    </div>
  )
}
