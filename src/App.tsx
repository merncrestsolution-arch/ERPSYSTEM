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
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<Products />} />
            <Route path="sales" element={<div className="p-8"><h2 className="text-2xl font-bold">Sales Module</h2><p>Coming in next phase...</p></div>} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="grn" element={<GRN />} />
            <Route path="grtn" element={<GRTN />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="cheques" element={<Cheques />} />
            <Route path="supplier-payments" element={<SupplierPayments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="cloud-sync" element={<CloudSync />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/invoice/:id" element={<InvoicePrint />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
