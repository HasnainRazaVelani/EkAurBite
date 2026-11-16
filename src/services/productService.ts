import { supabase } from '@/lib/supabase'
import type { Product, ProductIngredient, ProductWithIngredients, StockItem } from '@/lib/database.types'

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function fetchProducts(userId: string): Promise<ProductWithIngredients[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      product_ingredients (
        *,
        stock_items (*)
      )
    `)
    .eq('user_id', userId)
    .order('name')
  if (error) throw error

  return (products ?? []).map(p => {
    const ingredients = (p.product_ingredients ?? []).map((ing: ProductIngredient & { stock_items: StockItem }) => ({
      ...ing,
      stock_item: ing.stock_items,
    }))

    // Estimate cost from latest purchase price (cost_per_unit stored via stock_purchases)
    // This is approximate — real cost calc needs last purchase price
    const estimated_cost = 0 // Will be enriched when we have purchase data

    return {
      ...p,
      ingredients,
      estimated_cost,
    } as ProductWithIngredients
  })
}

export async function createProduct(
  userId: string,
  payload: {
    name: string
    description?: string
    default_selling_price: number
    photo_url?: string
    ingredients: { stock_item_id: string; quantity_used: number; unit: string }[]
  }
): Promise<Product> {
  const { ingredients, ...productData } = payload

  // Create product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({ ...productData, user_id: userId, is_active: true })
    .select()
    .single()
  if (productError) throw productError

  // Create ingredients
  if (ingredients.length > 0) {
    const { error: ingError } = await supabase
      .from('product_ingredients')
      .insert(ingredients.map(i => ({ ...i, product_id: product.id })))
    if (ingError) throw ingError
  }

  return product
}

export async function updateProduct(
  id: string,
  payload: {
    name?: string
    description?: string
    default_selling_price?: number
    photo_url?: string
    is_active?: boolean
    ingredients?: { stock_item_id: string; quantity_used: number; unit: string }[]
  }
): Promise<Product> {
  const { ingredients, ...productData } = payload

  const { data: product, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Replace ingredients if provided
  if (ingredients !== undefined) {
    await supabase.from('product_ingredients').delete().eq('product_id', id)
    if (ingredients.length > 0) {
      await supabase
        .from('product_ingredients')
        .insert(ingredients.map(i => ({ ...i, product_id: id })))
    }
  }

  return product
}

export async function deleteProduct(id: string): Promise<void> {
  // Ingredients cascade delete via FK
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadProductPhoto(file: File, productId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `products/${productId}.${ext}`

  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
  return data.publicUrl
}
