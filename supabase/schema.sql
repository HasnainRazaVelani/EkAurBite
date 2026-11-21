-- ============================================================
-- EK AUR BITE — Complete Database Schema
-- Run this in Supabase SQL Editor (one-time setup)
-- ============================================================

-- ─── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_user ON customers(user_id);

-- ─── STOCK ITEMS ─────────────────────────────────────────────
CREATE TABLE stock_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  unit                text NOT NULL CHECK (unit IN ('gram','kg','piece','litre','ml')),
  current_quantity    numeric NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_items_user ON stock_items(user_id);

-- ─── STOCK PURCHASES ────────────────────────────────────────
CREATE TABLE stock_purchases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_item_id       uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity_purchased  numeric NOT NULL,
  cost_per_unit       numeric NOT NULL DEFAULT 0,
  total_cost          numeric NOT NULL DEFAULT 0,
  purchased_at        timestamptz NOT NULL DEFAULT now(),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_purchases_item ON stock_purchases(stock_item_id);

-- ─── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  photo_url             text,
  default_selling_price numeric NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_user ON products(user_id);

-- ─── PRODUCT INGREDIENTS (recipe) ────────────────────────────
CREATE TABLE product_ingredients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity_used numeric NOT NULL DEFAULT 0,
  unit          text NOT NULL CHECK (unit IN ('gram','kg','piece','litre','ml'))
);

CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);

-- ─── ORDERS ──────────────────────────────────────────────────
CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number     serial,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    text,
  customer_phone   text,
  customer_address text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','paid')),
  payment_method   text CHECK (payment_method IN ('cash','online')),
  notes            text,
  ordered_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ─── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  cost_price    numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  notes         text
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ─── ORDER EXTRAS (delivery charges, discounts, etc.) ────────
CREATE TABLE order_extras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  type        text NOT NULL CHECK (type IN ('cost','revenue'))
);

CREATE INDEX idx_order_extras_order ON order_extras(order_id);

-- ─── EXPENSES ────────────────────────────────────────────────
CREATE TABLE expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     text NOT NULL CHECK (category IN ('utilities','transport','equipment','marketing','stock','other')),
  description  text NOT NULL,
  amount       numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only see/edit their own data
-- ============================================================

ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;

-- Customers
CREATE POLICY "Users manage own customers" ON customers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Stock Items
CREATE POLICY "Users manage own stock" ON stock_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Stock Purchases
CREATE POLICY "Users manage own purchases" ON stock_purchases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Products
CREATE POLICY "Users manage own products" ON products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Product Ingredients (via product ownership)
CREATE POLICY "Users manage own ingredients" ON product_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_ingredients.product_id AND products.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_ingredients.product_id AND products.user_id = auth.uid())
  );

-- Orders
CREATE POLICY "Users manage own orders" ON orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Order Items (via order ownership)
CREATE POLICY "Users manage own order items" ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Order Extras (via order ownership)
CREATE POLICY "Users manage own order extras" ON order_extras
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_extras.order_id AND orders.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_extras.order_id AND orders.user_id = auth.uid())
  );

-- Expenses
CREATE POLICY "Users manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DONE! All tables and security policies are set up.
-- Now create a user in Authentication → Users to log in.
-- ============================================================
