import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseCategory } from '@/lib/database.types'

// ─── FETCH EXPENSES ──────────────────────────────────────────────────────────

export async function fetchExpenses(
  userId: string,
  filters?: { category?: ExpenseCategory; date_from?: string; date_to?: string }
): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.date_from) query = query.gte('expense_date', filters.date_from)
  if (filters?.date_to) query = query.lte('expense_date', filters.date_to)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Expense[]
}

// ─── CREATE EXPENSE ──────────────────────────────────────────────────────────

export async function createExpense(
  userId: string,
  payload: {
    category: ExpenseCategory
    description: string
    amount: number
    expense_date: string
    notes?: string
  }
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      category: payload.category,
      description: payload.description,
      amount: payload.amount,
      expense_date: payload.expense_date,
      notes: payload.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Expense
}

// ─── UPDATE EXPENSE ──────────────────────────────────────────────────────────

export async function updateExpense(
  id: string,
  payload: Partial<{
    category: ExpenseCategory
    description: string
    amount: number
    expense_date: string
    notes: string
  }>
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

// ─── DELETE EXPENSE ──────────────────────────────────────────────────────────

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── EXPENSE SUMMARY ────────────────────────────────────────────────────────

export async function fetchExpenseSummary(userId: string, year: number) {
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const expenses = await fetchExpenses(userId, { date_from: from, date_to: to })

  const months: Record<number, { total: number; categories: Record<ExpenseCategory, number> }> = {}
  for (let m = 1; m <= 12; m++) {
    months[m] = {
      total: 0,
      categories: { utilities: 0, transport: 0, equipment: 0, marketing: 0, stock: 0, other: 0 },
    }
  }

  for (const e of expenses) {
    const month = new Date(e.expense_date).getMonth() + 1
    months[month].total += e.amount
    months[month].categories[e.category] += e.amount
  }

  return Object.entries(months).map(([m, d]) => ({
    month: parseInt(m),
    name: new Date(year, parseInt(m) - 1).toLocaleString('default', { month: 'short' }),
    ...d,
  }))
}
