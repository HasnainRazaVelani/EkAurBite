import { supabase } from '@/lib/supabase'
import type {
  StockItem, StockItemWithStatus, StockPurchase,
  StockUnit
} from '@/lib/database.types'

// ─── Helper: compute status ───────────────────────────────────────────────────
function getStockStatus(item: StockItem): 'good' | 'low' | 'out' {
  if (item.current_quantity <= 0) return 'out'
  if (item.current_quantity <= item.low_stock_threshold) return 'low'
  return 'good'
}

function withStatus(item: StockItem): StockItemWithStatus {
  return { ...item, status: getStockStatus(item) }
}

// ─── STOCK ITEMS ─────────────────────────────────────────────────────────────

export async function fetchStockItems(userId: string): Promise<StockItemWithStatus[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return (data ?? []).map(withStatus)
}

export async function createStockItem(
  userId: string,
  payload: { name: string; unit: StockUnit; current_quantity: number; low_stock_threshold: number }
): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock_items')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStockItem(
  id: string,
  payload: Partial<{ name: string; unit: StockUnit; current_quantity: number; low_stock_threshold: number }>
): Promise<StockItem> {
  const { data, error } = await supabase
    .from('stock_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
}

// ─── STOCK PURCHASES ─────────────────────────────────────────────────────────

export async function fetchPurchases(stockItemId: string): Promise<StockPurchase[]> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select('*')
    .eq('stock_item_id', stockItemId)
    .order('purchased_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPurchase(
  userId: string,
  payload: {
    stock_item_id: string
    quantity_purchased: number
    cost_per_unit: number
    purchased_at: string
    notes?: string
  }
): Promise<StockPurchase> {
  const total_cost = payload.quantity_purchased * payload.cost_per_unit

  // Insert purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('stock_purchases')
    .insert({ ...payload, total_cost, user_id: userId })
    .select()
    .single()
  if (purchaseError) throw purchaseError

  // Update stock quantity (add to existing)
  const { data: existing } = await supabase
    .from('stock_items')
    .select('current_quantity')
    .eq('id', payload.stock_item_id)
    .single()

  const newQty = (existing?.current_quantity ?? 0) + payload.quantity_purchased
  await supabase
    .from('stock_items')
    .update({ current_quantity: newQty })
    .eq('id', payload.stock_item_id)

  return purchase
}

export async function deletePurchase(id: string, stockItemId: string, qty: number): Promise<void> {
  // Reverse the quantity
  const { data: existing } = await supabase
    .from('stock_items')
    .select('current_quantity')
    .eq('id', stockItemId)
    .single()

  const newQty = Math.max(0, (existing?.current_quantity ?? 0) - qty)
  await supabase.from('stock_items').update({ current_quantity: newQty }).eq('id', stockItemId)
  const { error } = await supabase.from('stock_purchases').delete().eq('id', id)
  if (error) throw error
}

// ─── LOW STOCK ALERTS ────────────────────────────────────────────────────────

export function getLowStockItems(items: StockItemWithStatus[]): StockItemWithStatus[] {
  return items.filter(i => i.status !== 'good')
}
