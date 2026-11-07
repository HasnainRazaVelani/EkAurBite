// ============================================================
// DATABASE TYPES — mirrors the Supabase PostgreSQL schema
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>
      }
      stock_items: {
        Row: StockItem
        Insert: Omit<StockItem, 'id' | 'created_at'>
        Update: Partial<Omit<StockItem, 'id' | 'created_at'>>
      }
      stock_purchases: {
        Row: StockPurchase
        Insert: Omit<StockPurchase, 'id' | 'created_at'>
        Update: Partial<Omit<StockPurchase, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      product_ingredients: {
        Row: ProductIngredient
        Insert: Omit<ProductIngredient, 'id'>
        Update: Partial<Omit<ProductIngredient, 'id'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'order_number'>
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'order_number'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id'>
        Update: Partial<Omit<OrderItem, 'id'>>
      }
      order_extras: {
        Row: OrderExtra
        Insert: Omit<OrderExtra, 'id'>
        Update: Partial<Omit<OrderExtra, 'id'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
      }
    }
  }
}

// ============================================================
// DOMAIN TYPES
// ============================================================

export interface Customer {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type StockUnit = 'gram' | 'kg' | 'piece' | 'litre' | 'ml'

export interface StockItem {
  id: string
  user_id: string
  name: string
  unit: StockUnit
  current_quantity: number
  low_stock_threshold: number
  created_at: string
}

export interface StockPurchase {
  id: string
  user_id: string
  stock_item_id: string
  quantity_purchased: number
  cost_per_unit: number
  total_cost: number
  purchased_at: string
  notes: string | null
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  description: string | null
  photo_url: string | null
  default_selling_price: number
  is_active: boolean
  created_at: string
}

export interface ProductIngredient {
  id: string
  product_id: string
  stock_item_id: string
  quantity_used: number
  unit: StockUnit
}

export type OrderStatus = 'pending' | 'delivered' | 'paid'
export type PaymentMethod = 'cash' | 'online' | null

export interface Order {
  id: string
  user_id: string
  order_number: number
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  status: OrderStatus
  payment_method: PaymentMethod
  notes: string | null
  ordered_at: string
  delivered_at: string | null
  paid_at: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  cost_price: number
  selling_price: number
  notes: string | null
}

export type ExtraType = 'cost' | 'revenue'

export interface OrderExtra {
  id: string
  order_id: string
  description: string
  amount: number
  type: ExtraType
}

export type ExpenseCategory = 'utilities' | 'transport' | 'equipment' | 'marketing' | 'stock' | 'other'

export interface Expense {
  id: string
  user_id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  notes: string | null
  created_at: string
}

// ============================================================
// ENRICHED / COMPUTED TYPES (used in UI)
// ============================================================

export interface StockItemWithStatus extends StockItem {
  status: 'good' | 'low' | 'out'
  last_purchase?: StockPurchase
}

export interface ProductWithIngredients extends Product {
  ingredients: (ProductIngredient & { stock_item: StockItem })[]
  estimated_cost: number
}

export interface OrderWithDetails extends Order {
  items: (OrderItem & { product?: Product })[]
  extras: OrderExtra[]
  total_cost: number
  total_selling: number
  total_profit: number
  customer?: Customer | null
}

export interface CustomerWithStats extends Customer {
  total_orders: number
  total_spent: number
  last_order_date: string | null
}
