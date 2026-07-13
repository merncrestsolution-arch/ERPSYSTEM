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
import LiveTracking from './pages/LiveTracking';
import RoutesPage from './pages/Routes';
import VisitCheckIn from './pages/VisitCheckIn';
import InventoryAdvanced from './pages/InventoryAdvanced';
import SalesFinance from './pages/SalesFinance';
import OfflineSync from './pages/OfflineSync';
import FleetOps from './pages/FleetOps';
import AdminHub from './pages/AdminHub';
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

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<DashboardHome />} />

              <Route element={<ProtectedRoute allowedRoles={['Store Manager']} />}>
                <Route path="products" element={<Products />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="grn" element={<GRN />} />
                <Route path="grtn" element={<GRTN />} />
                <Route path="inventory-advanced" element={<InventoryAdvanced />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Sales Officer']} />}>
                <Route path="customers" element={<Customers />} />
                <Route path="sales" element={<Sales />} />
                <Route path="routes" element={<RoutesPage />} />
                <Route path="visits" element={<VisitCheckIn />} />
                <Route path="sales-finance" element={<SalesFinance />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Director', 'Accountant']} />}>
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="supplier-payments" element={<SupplierPayments />} />
                <Route path="cheques" element={<Cheques />} />
                <Route path="sales-finance-acct" element={<SalesFinance />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Director']} />}>
                <Route path="reports" element={<Reports />} />
                <Route path="tracking" element={<LiveTracking />} />
                <Route path="admin-hub" element={<AdminHub />} />
                <Route path="fleet" element={<FleetOps />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="cloud-sync" element={<CloudSync />} />
                <Route path="offline-sync" element={<OfflineSync />} />
                <Route path="settings" element={<Settings />} />
                <Route path="fleet-admin" element={<FleetOps />} />
                <Route path="admin-hub-admin" element={<AdminHub />} />
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
