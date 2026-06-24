import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Vehicles from './pages/Vehicles';
import GRN from './pages/GRN';
import GRTN from './pages/GRTN';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Cheques from './pages/Cheques';
import SupplierPayments from './pages/SupplierPayments';
import Reports from './pages/Reports';
import InvoicePrint from './pages/InvoicePrint';
import CloudSync from './pages/CloudSync';
import Settings from './pages/Settings';
import ApprovalCenter from './pages/ApprovalCenter';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated area */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<DashboardHome />} />

              <Route element={<ProtectedRoute allowedRoles={['Store Manager']} />}>
                <Route path="products" element={<Products />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="grn" element={<GRN />} />
                <Route path="grtn" element={<GRTN />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Sales Officer']} />}>
                <Route path="customers" element={<Customers />} />
                <Route path="sales" element={<Sales />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Director', 'Accountant']} />}>
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="supplier-payments" element={<SupplierPayments />} />
                <Route path="cheques" element={<Cheques />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Director']} />}>
                <Route path="reports" element={<Reports />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="cloud-sync" element={<CloudSync />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Director', 'Accountant', 'Store Manager']} />}>
                <Route path="approvals" element={<ApprovalCenter />} />
              </Route>
            </Route>

            <Route path="/invoice/:id" element={<InvoicePrint />} />
          </Route>
        </Routes>
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
