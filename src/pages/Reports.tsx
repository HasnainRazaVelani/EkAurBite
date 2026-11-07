import { PageHeader } from '@/components/shared/Layout'

export default function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" subtitle="Monthly & quarterly analytics" />
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-lg font-semibold text-foreground">Reports coming soon...</p>
        <p className="text-sm mt-1">Revenue, profit charts, top products, customer analytics.</p>
      </div>
    </div>
  )
}
