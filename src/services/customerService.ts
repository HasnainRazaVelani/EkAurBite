import { supabase } from '@/lib/supabase'
import type { Customer, CustomerWithStats } from '@/lib/database.types'

export async function fetchCustomers(userId: string): Promise<CustomerWithStats[]> {
  // Get customers with order aggregates via a join
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error

  // For each customer, get order stats
  const withStats = await Promise.all(
    (customers ?? []).map(async (c) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_items(selling_price, quantity), order_extras(amount, type), ordered_at')
        .eq('customer_id', c.id)
        .eq('status', 'paid')

      let total_spent = 0
      let last_order_date: string | null = null

      for (const order of orders ?? []) {
        const itemTotal = (order.order_items ?? []).reduce(
          (sum: number, i: { selling_price: number; quantity: number }) => sum + i.selling_price * i.quantity, 0
        )
        const extrasTotal = (order.order_extras ?? []).reduce(
          (sum: number, e: { amount: number; type: string }) =>
            e.type === 'revenue' ? sum + e.amount : sum, 0
        )
        total_spent += itemTotal + extrasTotal

        if (!last_order_date || order.ordered_at > last_order_date) {
          last_order_date = order.ordered_at
        }
      }

      return {
        ...c,
        total_orders: (orders ?? []).length,
        total_spent,
        last_order_date,
      } as CustomerWithStats
    })
  )

  return withStats
}

export async function searchCustomers(userId: string, query: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(10)
  if (error) throw error
  return data ?? []
}

export async function createCustomer(
  userId: string,
  payload: { name: string; phone?: string; address?: string; notes?: string }
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(
  id: string,
  payload: Partial<{ name: string; phone: string; address: string; notes: string }>
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}
