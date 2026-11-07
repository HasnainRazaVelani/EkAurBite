import { PageHeader } from '@/components/shared/Layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle="Your customer directory"
        action={<Button className="gradient-brand border-0 text-white gap-2"><Plus size={16} /> Add Customer</Button>}
      />
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        <div className="text-5xl mb-4">👥</div>
        <p className="text-lg font-semibold text-foreground">Customers module coming soon...</p>
        <p className="text-sm mt-1">Customer directory, order history, and spending analytics.</p>
      </div>
    </div>
  )
}
