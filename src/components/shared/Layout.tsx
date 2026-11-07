import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ===================== STAT CARD =====================

interface StatCardProps {
  title: string
  value: string | ReactNode
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label: string }
  className?: string
  accentColor?: string
}

export function StatCard({ title, value, subtitle, icon, trend, className, accentColor = '#7C3AED' }: StatCardProps) {
  return (
    <div className={cn(
      'glass rounded-2xl p-5 card-hover relative overflow-hidden',
      className
    )}>
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ background: accentColor }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
            {title}
          </p>
          <div className="text-2xl font-bold font-display text-foreground mt-1">
            {value}
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs mt-2 font-medium',
              trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: `${accentColor}30`, color: accentColor }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== SECTION HEADER =====================

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground font-display">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ===================== EMPTY STATE =====================

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4 opacity-30">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// ===================== PAGE HEADER =====================

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  back?: () => void
}

export function PageHeader({ title, subtitle, action, back }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      {back && (
        <button
          onClick={back}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          ←
        </button>
      )}
      <div className="flex-1">
        <h1 className="text-2xl font-bold font-display gradient-text">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ===================== LOADING SPINNER =====================

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn(
      'rounded-full border-2 border-primary/20 border-t-primary animate-spin',
      sizes[size]
    )} />
  )
}

// ===================== ALERT BANNER =====================

interface AlertBannerProps {
  items: string[]
  onDismiss?: () => void
}

export function LowStockAlertBanner({ items, onDismiss }: AlertBannerProps) {
  if (items.length === 0) return null
  return (
    <div className="alert-glow rounded-xl p-4 mb-4 flex items-start gap-3 bg-rose-500/10 border border-rose-500/30">
      <span className="text-xl shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-rose-400 font-semibold text-sm">Low Stock Alert</p>
        <p className="text-rose-300/80 text-xs mt-0.5 truncate">
          {items.slice(0, 3).join(', ')}{items.length > 3 ? ` +${items.length - 3} more` : ''}
        </p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-rose-400 hover:text-rose-200 text-lg leading-none">×</button>
      )}
    </div>
  )
}
