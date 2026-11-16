import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/Navigation'
import { LoadingSpinner } from '@/components/shared/Layout'
import { Toaster } from '@/components/ui/toast'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import StockPage from '@/pages/Stock'
import ProductsPage from '@/pages/Products'
import OrdersPage from '@/pages/Orders'
import NewOrderPage from '@/pages/NewOrder'
import OrderDetailPage from '@/pages/OrderDetail'
import CustomersPage from '@/pages/Customers'
import ReportsPage from '@/pages/Reports'
import ExpensesPage from '@/pages/Expenses'
import SettingsPage from '@/pages/Settings'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">🍫</div>
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <AppShell>
      <Routes>
        <Route path="/"             element={<DashboardPage />} />
        <Route path="/stock"        element={<StockPage />} />
        <Route path="/products"     element={<ProductsPage />} />
        <Route path="/orders"       element={<OrdersPage />} />
        <Route path="/orders/new"   element={<NewOrderPage />} />
        <Route path="/orders/:id"   element={<OrderDetailPage />} />
        <Route path="/customers"    element={<CustomersPage />} />
        <Route path="/reports"      element={<ReportsPage />} />
        <Route path="/expenses"     element={<ExpensesPage />} />
        <Route path="/settings"     element={<SettingsPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
