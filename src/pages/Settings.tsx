import { PageHeader } from '@/components/shared/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { LogOut, Receipt, User, Shield, ChevronRight, Smartphone, Info } from 'lucide-react'

export default function SettingsPage() {
  const { signOut, user } = useAuth()
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Settings" subtitle="App configuration & account" />

      {/* Account */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-5">
          <h3 className="text-foreground font-semibold text-sm flex items-center gap-2 mb-4">
            <User size={16} className="text-primary" /> Account
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="text-foreground font-medium text-sm mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">User ID</p>
              <p className="text-foreground font-mono text-xs mt-0.5 truncate">{user?.id}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-none py-4"
          >
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <h3 className="text-foreground font-semibold text-sm flex items-center gap-2 p-5 pb-3">
          <Receipt size={16} className="text-primary" /> Quick Links
        </h3>
        {[
          { to: '/expenses', label: 'Manage Expenses', desc: 'Track business expenses', icon: Receipt, color: 'text-amber-400' },
          { to: '/reports', label: 'Financial Reports', desc: 'Monthly & quarterly reports', icon: ChevronRight, color: 'text-emerald-400' },
          { to: '/customers', label: 'Customer Directory', desc: 'Manage customer contacts', icon: User, color: 'text-sky-400' },
        ].map((link, i) => (
          <Link key={link.to} to={link.to}>
            <div className={`flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors ${
              i > 0 ? 'border-t border-border' : ''
            }`}>
              <link.icon size={16} className={link.color} />
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">{link.label}</p>
                <p className="text-muted-foreground text-xs">{link.desc}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      {/* About */}
      <div className="glass rounded-2xl border border-border p-5">
        <h3 className="text-foreground font-semibold text-sm flex items-center gap-2 mb-3">
          <Info size={16} className="text-primary" /> About
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App</span>
            <span className="text-foreground font-medium">🍫 Ek Aur Bite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="text-foreground font-mono text-xs">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stack</span>
            <span className="text-foreground text-xs">React + Supabase + Cloudflare</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-muted-foreground text-xs text-center">
            Made with ❤️ for Ek Aur Bite's home chocolate business
          </p>
        </div>
      </div>

      {/* Install as app hint */}
      <div className="glass rounded-2xl border border-border p-5 text-center">
        <Smartphone size={24} className="mx-auto text-primary mb-2" />
        <p className="text-foreground font-medium text-sm">Install as App</p>
        <p className="text-muted-foreground text-xs mt-1">
          On mobile: Open in browser → tap "Add to Home Screen" for a native app experience
        </p>
      </div>
    </div>
  )
}
