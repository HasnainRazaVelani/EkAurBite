import { PageHeader } from '@/components/shared/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function SettingsPage() {
  const { signOut, user } = useAuth()
  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" subtitle="App configuration" />
      <div className="glass rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">Logged in as</p>
          <p className="text-foreground font-medium mt-0.5">{user?.email}</p>
        </div>
        <Button
          onClick={signOut}
          variant="destructive"
          className="gap-2"
        >
          <LogOut size={16} /> Sign Out
        </Button>
      </div>
    </div>
  )
}
