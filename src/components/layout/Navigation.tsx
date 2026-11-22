import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Home, Package, ShoppingBag, Users, Receipt, BarChart3, Settings
} from 'lucide-react'

const navItems = [
  { to: '/',          icon: Home,        label: 'Dashboard' },
  { to: '/stock',     icon: Package,     label: 'Stock'     },
  { to: '/products',  icon: ShoppingBag, label: 'Products'  },
  { to: '/orders',    icon: Receipt,     label: 'Orders'    },
  { to: '/customers', icon: Users,       label: 'Customers' },
  { to: '/reports',   icon: BarChart3,   label: 'Reports'   },
  { to: '/settings',  icon: Settings,    label: 'Settings'  },
]

// ===================== BOTTOM NAV (Mobile) =====================

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border safe-area-pb md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive && 'bg-primary/15'
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// ===================== SIDEBAR NAV (Desktop) =====================

export function SidebarNav() {
  const location = useLocation()

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen glass border-r border-border p-4 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="mb-8 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center text-xl">
            🍫
          </div>
          <div>
            <h1 className="font-bold font-display text-lg gradient-text">Ek Aur Bite</h1>
            <p className="text-muted-foreground text-xs">Business Manager</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom branding */}
      <div className="mt-auto pt-4 border-t border-border px-2">
        <p className="text-muted-foreground text-xs text-center">
          🍫 Ek Aur Bite v1.0
        </p>
      </div>
    </aside>
  )
}

// ===================== APP SHELL =====================

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <SidebarNav />
      <main className="md:pl-64 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
