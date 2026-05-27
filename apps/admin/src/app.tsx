import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Shell } from "@/components/layout/shell"
import { LoginPage } from "@/routes/login"
import { DashboardPage } from "@/routes/dashboard"
import { ProductListPage } from "@/routes/products/list"
import { ProductCreatePage } from "@/routes/products/create"
import { ProductDetailPage } from "@/routes/products/detail"
import { OrderListPage } from "@/routes/orders/list"
import { OrderDetailPage } from "@/routes/orders/detail"
import { CustomerListPage } from "@/routes/customers/list"
import { CustomerDetailPage } from "@/routes/customers/detail"

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductCreatePage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
