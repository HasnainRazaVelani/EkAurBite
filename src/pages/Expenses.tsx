import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/shared/Layout'
import { Currency } from '@/components/shared/Badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Pencil, Trash2, Receipt, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/services/expenseService'
import type { Expense, ExpenseCategory } from '@/lib/database.types'

interface CategoryMeta {
  label: string
  emoji: string
  color: string
  bg: string
  border: string
  barBg: string
  badgeCls: string
}

const CATEGORY_CONFIG: Record<ExpenseCategory, CategoryMeta> = {
  utilities: {
    label: 'Utilities',
    emoji: '⚡',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    barBg: 'bg-amber-500',
    badgeCls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  },
  transport: {
    label: 'Transport',
    emoji: '🚚',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    barBg: 'bg-blue-500',
    badgeCls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  },
  equipment: {
    label: 'Equipment',
    emoji: '🔧',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    barBg: 'bg-purple-500',
    badgeCls: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  },
  marketing: {
    label: 'Marketing',
    emoji: '📣',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    barBg: 'bg-pink-500',
    badgeCls: 'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  },
  stock: {
    label: 'Stock',
    emoji: '📦',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    barBg: 'bg-emerald-500',
    badgeCls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  },
  other: {
    label: 'Other',
    emoji: '📝',
    color: 'text-gray-400',
    bg: 'bg-gray-500/15',
    border: 'border-gray-500/30',
    barBg: 'bg-gray-500',
    badgeCls: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  },
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  'utilities',
  'transport',
  'equipment',
  'marketing',
  'stock',
  'other',
]

const CATEGORY_FILTERS: { label: string; value: ExpenseCategory | 'all'; emoji?: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Utilities', value: 'utilities', emoji: '⚡' },
  { label: 'Transport', value: 'transport', emoji: '🚚' },
  { label: 'Equipment', value: 'equipment', emoji: '🔧' },
  { label: 'Marketing', value: 'marketing', emoji: '📣' },
  { label: 'Stock', value: 'stock', emoji: '📦' },
  { label: 'Other', value: 'other', emoji: '📝' },
]

function formatDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      return format(new Date(year, month, day), 'dd MMM yyyy')
    }
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('utilities')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')

  const loadExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchExpenses(user.id)
      setExpenses(data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadExpenses()
  }, [loadExpenses])

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        item.description.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [expenses, selectedCategory, search])

  // Stats calculation
  const today = useMemo(() => new Date(), [])
  const currentMonthPrefix = useMemo(() => format(today, 'yyyy-MM'), [today])

  const thisMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.expense_date.startsWith(currentMonthPrefix))
  }, [expenses, currentMonthPrefix])

  const thisMonthTotal = useMemo(() => {
    return thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [thisMonthExpenses])

  const allTimeTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [expenses])

  const categoryStats = useMemo(() => {
    return ALL_CATEGORIES.map(cat => {
      const catExpenses = thisMonthExpenses.filter(e => e.category === cat)
      const amount = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      const percentage = thisMonthTotal > 0 ? (amount / thisMonthTotal) * 100 : 0
      return {
        category: cat,
        amount,
        count: catExpenses.length,
        percentage,
        meta: CATEGORY_CONFIG[cat],
      }
    })
  }, [thisMonthExpenses, thisMonthTotal])

  // Modal openers
  const openAddModal = () => {
    setEditingExpense(null)
    setFormCategory('utilities')
    setFormDescription('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
    setModalOpen(true)
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setFormCategory(expense.category)
    setFormDescription(expense.description)
    setFormAmount(String(expense.amount))
    setFormDate(expense.expense_date)
    setFormNotes(expense.notes || '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingExpense(null)
  }

  const handleSave = async () => {
    if (!user || !formDescription.trim()) return
    const numericAmount = parseFloat(formAmount)
    if (isNaN(numericAmount) || numericAmount <= 0) return

    setSaving(true)
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category: formCategory,
          description: formDescription.trim(),
          amount: numericAmount,
          expense_date: formDate,
          notes: formNotes.trim() || undefined,
        })
      } else {
        await createExpense(user.id, {
          category: formCategory,
          description: formDescription.trim(),
          amount: numericAmount,
          expense_date: formDate,
          notes: formNotes.trim() || undefined,
        })
      }
      closeModal()
      await loadExpenses()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      await deleteExpense(deleteConfirm.id)
      setDeleteConfirm(null)
      await loadExpenses()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track operating overheads & category spending"
        action={
          <Button onClick={openAddModal} className="gradient-brand border-0 text-white gap-2">
            <Plus size={16} /> Add Expense
          </Button>
        }
      />

      {/* ── Summary Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 card-hover">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">This Month</p>
          <p className="text-2xl font-bold font-display text-primary mt-1">
            <Currency amount={thisMonthTotal} />
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {thisMonthExpenses.length} record{thisMonthExpenses.length !== 1 ? 's' : ''} in{' '}
            {format(today, 'MMM yyyy')}
          </p>
        </div>

        <div className="glass rounded-2xl p-4 card-hover">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">All-Time Total</p>
          <p className="text-2xl font-bold font-display text-foreground mt-1">
            <Currency amount={allTimeTotal} />
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {expenses.length} total expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="glass rounded-2xl p-4 card-hover col-span-2 md:col-span-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">Filtered Total</p>
          <p className="text-2xl font-bold font-display text-emerald-400 mt-1">
            <Currency
              amount={filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)}
            />
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {filteredExpenses.length} showing currently
          </p>
        </div>
      </div>

      {/* ── Category Breakdown ─────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground font-display text-sm md:text-base">
            This Month's Category Breakdown
          </h3>
          <span className="text-xs text-muted-foreground">
            {format(today, 'MMMM yyyy')}
          </span>
        </div>

        {/* Proportional Segment Bar */}
        {thisMonthTotal > 0 ? (
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex mb-4">
            {categoryStats
              .filter(c => c.amount > 0)
              .map(c => (
                <div
                  key={c.category}
                  className={`h-full ${c.meta.barBg} transition-all`}
                  style={{ width: `${c.percentage}%` }}
                  title={`${c.meta.label}: ₹${c.amount} (${c.percentage.toFixed(1)}%)`}
                />
              ))}
          </div>
        ) : (
          <div className="h-2 w-full bg-secondary/50 rounded-full mb-4" />
        )}

        {/* 6 Category Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {categoryStats.map(c => {
            const isFilterActive = selectedCategory === c.category
            return (
              <button
                key={c.category}
                type="button"
                onClick={() =>
                  setSelectedCategory(selectedCategory === c.category ? 'all' : c.category)
                }
                className={`glass rounded-xl p-3 text-left transition-all border ${
                  isFilterActive
                    ? `${c.meta.border} bg-secondary/40 ring-1 ring-primary/40`
                    : 'border-border/60 hover:border-border hover:bg-secondary/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{c.meta.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {c.count} {c.count === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground truncate">{c.meta.label}</p>
                <p className={`text-sm font-bold mt-0.5 ${c.meta.color}`}>
                  <Currency amount={c.amount} />
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {thisMonthTotal > 0 ? `${c.percentage.toFixed(0)}% of month` : '0%'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Category Filter Pills ───────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORY_FILTERS.map(f => {
          const isSelected = selectedCategory === f.value
          return (
            <button
              key={f.value}
              onClick={() => setSelectedCategory(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-primary text-white'
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.emoji && <span>{f.emoji}</span>}
              <span>{f.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Search Input ────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Search expenses by description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-secondary/50"
        />
      </div>

      {/* ── Expenses List ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="No expenses found"
          description={
            search || selectedCategory !== 'all'
              ? 'No expenses match your search or filter criteria. Try resetting filters.'
              : 'Add your operational expenses like electricity, fuel, packaging, and repairs.'
          }
          action={
            <Button onClick={openAddModal} className="gradient-brand border-0 text-white gap-2">
              <Plus size={16} /> Add Expense
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map(item => {
            const config = CATEGORY_CONFIG[item.category]
            return (
              <div
                key={item.id}
                className="glass rounded-xl border border-border card-hover overflow-hidden transition-all"
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Category Emoji Badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}
                  >
                    <span className="text-xl">{config.emoji}</span>
                  </div>

                  {/* Description & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-semibold text-sm truncate">
                        {item.description}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.badgeCls}`}
                      >
                        {config.emoji} {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.expense_date)}
                      </span>
                      {item.notes && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[200px] md:max-w-md">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-foreground font-bold text-base md:text-lg">
                      <Currency amount={item.amount} />
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="w-8 h-8 rounded-lg glass text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      title="Edit Expense"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item)}
                      className="w-8 h-8 rounded-lg glass text-muted-foreground flex items-center justify-center hover:text-rose-400 transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pb-8 md:pb-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6 animate-slide-up border border-border">
            <h2 className="text-lg font-bold font-display mb-5">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Category</Label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                  className="mt-1 w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Description</Label>
                <Input
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. Factory electricity bill, Packaging boxes..."
                  className="mt-1 bg-secondary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-sm">Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 bg-secondary/50"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Date</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="mt-1 bg-secondary/50"
                  />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Notes (optional)</Label>
                <Input
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Receipt number, payment method, vendor..."
                  className="mt-1 bg-secondary/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={closeModal} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !formDescription.trim() ||
                  !formAmount ||
                  parseFloat(formAmount) <= 0
                }
                className="flex-1 gradient-brand border-0 text-white"
              >
                {saving ? 'Saving...' : editingExpense ? 'Save Changes' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm p-6 text-center animate-slide-up border border-border">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold mb-2">Delete Expense?</h3>
            <p className="text-muted-foreground text-sm mb-1">
              Are you sure you want to delete{' '}
              <span className="text-foreground font-semibold">"{deleteConfirm.description}"</span>?
            </p>
            <p className="text-muted-foreground text-xs mb-6">
              Amount: <Currency amount={deleteConfirm.amount} /> · This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-destructive text-white border-0"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

