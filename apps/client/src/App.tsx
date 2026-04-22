import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout        from "./components/layout/Layout";
import AuthPage      from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import RafiPage from "./pages/RafiPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrderFormPage from "./pages/OrderFormPage";
import PaymentsPage  from "./pages/PaymentsPage";
import BrandsPage from "./pages/BrandsPage";
import SuppliersPage from "./pages/SuppliersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="auth" element={<AuthPage />} />
        <Route element={<Layout />}>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/rafi"        element={<RafiPage />} />
          <Route path="/orders"      element={<OrdersPage />} />
          <Route path="orders/new"   element={<OrderFormPage />} />
          <Route path="orders/:id"        element={<OrderDetailPage />} />
          <Route path="orders/:id/edit"   element={<OrderFormPage />} />
          <Route path="payments"     element={<PaymentsPage />} />
          <Route path="payments/new" element={<PaymentsPage />} />
          <Route path="brands"       element={<BrandsPage />} />
          <Route path="suppliers"    element={<SuppliersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
