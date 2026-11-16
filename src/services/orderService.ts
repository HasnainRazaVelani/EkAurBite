import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, OrderExtra, OrderWithDetails, PaymentMethod, OrderStatus } from '@/lib/database.types'

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function fetchOrders(userId: string, filters?: {
  status?: OrderStatus
  payment_method?: PaymentMethod
  customer_id?: string
  date_from?: string
  date_to?: string
}): Promise<OrderWithDetails[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (*),
      order_extras (*)
    `)
    .eq('user_id', userId)
    .order('ordered_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id)
  if (filters?.date_from) query = query.gte('ordered_at', filters.date_from)
  if (filters?.date_to) query = query.lte('ordered_at', filters.date_to)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map(enrichOrder)
}

export async function fetchOrder(id: string): Promise<OrderWithDetails | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*), order_extras (*)`)
    .eq('id', id)
    .single()
  if (error) return null
  return enrichOrder(data)
}

function enrichOrder(o: Order & { order_items: OrderItem[]; order_extras: OrderExtra[] }): OrderWithDetails {
  const items = o.order_items ?? []
  const extras = o.order_extras ?? []

  const total_cost = items.reduce((s, i) => s + i.cost_price * i.quantity, 0)
    + extras.filter(e => e.type === 'cost').reduce((s, e) => s + e.amount, 0)

  const total_selling = items.reduce((s, i) => s + i.selling_price * i.quantity, 0)
    + extras.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0)

  return {
    ...o,
    items,
    extras,
    total_cost,
    total_selling,
    total_profit: total_selling - total_cost,
  }
}

export async function createOrder(
  userId: string,
  payload: {
    customer_id?: string
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    status: OrderStatus
    payment_method: PaymentMethod
    notes?: string
    ordered_at: string
    items: {
      product_id?: string
      product_name: string
      quantity: number
      cost_price: number
      selling_price: number
      notes?: string
    }[]
    extras: {
      description: string
      amount: number
      type: 'cost' | 'revenue'
    }[]
  }
): Promise<Order> {
  const { items, extras, ...orderData } = payload

  const { data: order, error } = await supabase
    .from('orders')
    .insert({ ...orderData, user_id: userId })
    .select()
    .single()
  if (error) throw error

  if (items.length > 0) {
    const { error: ie } = await supabase
      .from('order_items')
      .insert(items.map(i => ({ ...i, order_id: order.id })))
    if (ie) throw ie
  }

  if (extras.length > 0) {
    const { error: ee } = await supabase
      .from('order_extras')
      .insert(extras.map(e => ({ ...e, order_id: order.id })))
    if (ee) throw ee
  }

  return order
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  payment_method?: PaymentMethod
): Promise<void> {
  const update: Partial<Order> = { status }
  if (status === 'delivered') update.delivered_at = new Date().toISOString()
  if (status === 'paid') {
    update.paid_at = new Date().toISOString()
    if (payment_method) update.payment_method = payment_method
  }
  const { error } = await supabase.from('orders').update(update).eq('id', id)
  if (error) throw error
}

export async function updateOrder(
  id: string,
  payload: Partial<{
    customer_name: string; customer_phone: string; customer_address: string
    status: OrderStatus; payment_method: PaymentMethod; notes: string
  }>
): Promise<void> {
  const { error } = await supabase.from('orders').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// ─── REPORTS DATA ─────────────────────────────────────────────────────────────

export async function fetchMonthlyReport(userId: string, year: number) {
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const orders = await fetchOrders(userId, { date_from: from, date_to: to })

  // Group by month
  const months: Record<number, { revenue: number; cost: number; profit: number; count: number }> = {}
  for (let m = 1; m <= 12; m++) {
    months[m] = { revenue: 0, cost: 0, profit: 0, count: 0 }
  }

  for (const o of orders) {
    const month = new Date(o.ordered_at).getMonth() + 1
    months[month].revenue += o.total_selling
    months[month].cost    += o.total_cost
    months[month].profit  += o.total_profit
    months[month].count++
  }

  return Object.entries(months).map(([m, d]) => ({
    month: parseInt(m),
    name: new Date(year, parseInt(m) - 1).toLocaleString('default', { month: 'short' }),
    ...d,
  }))
}
