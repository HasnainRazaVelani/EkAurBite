import { cn } from '@/lib/utils'
import type { OrderStatus, PaymentMethod } from '@/lib/database.types'

// ===================== STATUS BADGE =====================

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    pending:   { label: '⏳ Pending',   cls: 'badge-pending' },
    delivered: { label: '📦 Delivered', cls: 'badge-delivered' },
    paid:      { label: '✅ Paid',      cls: 'badge-paid' },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      cls, className
    )}>
      {label}
    </span>
  )
}

// ===================== PAYMENT BADGE =====================

interface PaymentBadgeProps {
  method: PaymentMethod
  className?: string
}

export function PaymentBadge({ method, className }: PaymentBadgeProps) {
  if (!method) return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      'bg-gray-500/15 text-gray-400 border border-gray-500/30',
      className
    )}>
      Unpaid
    </span>
  )
  const map: Record<string, { label: string; cls: string }> = {
    cash:   { label: '💵 Cash',   cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    online: { label: '📱 Online', cls: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' },
  }
  const { label, cls } = map[method]
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      cls, className
    )}>
      {label}
    </span>
  )
}

// ===================== STOCK STATUS BADGE =====================

interface StockBadgeProps {
  status: 'good' | 'low' | 'out'
  className?: string
}

export function StockBadge({ status, className }: StockBadgeProps) {
  const map = {
    good: { dot: 'bg-emerald-500', label: 'Good',     cls: 'text-emerald-400' },
    low:  { dot: 'bg-amber-500',  label: 'Low',      cls: 'text-amber-400'  },
    out:  { dot: 'bg-rose-500',   label: 'Out',      cls: 'text-rose-400'   },
  }
  const { dot, label, cls } = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', cls, className)}>
      <span className={cn('w-2 h-2 rounded-full', dot, status === 'low' && 'animate-pulse')} />
      {label}
    </span>
  )
}

// ===================== CURRENCY DISPLAY =====================

interface CurrencyProps {
  amount: number
  className?: string
  showSign?: boolean
}

export function Currency({ amount, className, showSign }: CurrencyProps) {
  const isNegative = amount < 0
  return (
    <span className={cn(className)}>
      {showSign && !isNegative && '+'}
      ₹{Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  )
}

// ===================== PROFIT DISPLAY =====================

interface ProfitProps {
  profit: number
  className?: string
}

export function ProfitDisplay({ profit, className }: ProfitProps) {
  const isPositive = profit >= 0
  return (
    <span className={cn(
      'font-semibold',
      isPositive ? 'text-profit' : 'text-loss',
      className
    )}>
      {isPositive ? '+' : ''}₹{Math.abs(profit).toLocaleString('en-IN')}
    </span>
  )
}
