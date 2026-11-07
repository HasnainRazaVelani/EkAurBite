import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/Layout'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div className="animate-fade-in">
      <PageHeader title={`Order #${id}`} back={() => navigate('/orders')} />
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
        <div className="text-5xl mb-4">🧾</div>
        <p className="text-lg font-semibold text-foreground">Order detail + bill view coming soon...</p>
      </div>
    </div>
  )
}
