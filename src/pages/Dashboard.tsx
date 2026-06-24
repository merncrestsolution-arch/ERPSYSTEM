import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  PackageMinus,
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Truck,
  FileText,
  Banknote,
  Cloud,
  CheckCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 w-full">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-wider">ERP SYSTEM</h1>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" path="/dashboard" currentPath={location.pathname} navigate={navigate} />
          
          {hasRole(['Store Manager']) && (
            <>
              <NavItem icon={<Package size={20} />} label="Products" path="/dashboard/products" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<LayoutDashboard size={20} />} label="Inventory" path="/dashboard/inventory" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<Package size={20} />} label="Receive GRN" path="/dashboard/grn" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<PackageMinus size={20} />} label="Return GRTN" path="/dashboard/grtn" currentPath={location.pathname} navigate={navigate} />
            </>
          )}

          {hasRole(['Sales Officer']) && (
            <>
              <NavItem icon={<Users size={20} />} label="Customers" path="/dashboard/customers" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<ShoppingCart size={20} />} label="Sales" path="/dashboard/sales" currentPath={location.pathname} navigate={navigate} />
            </>
          )}

          {hasRole(['Director', 'Accountant']) && (
            <>
              <NavItem icon={<Users size={20} />} label="Suppliers" path="/dashboard/suppliers" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<Banknote size={20} />} label="Sup. Payments" path="/dashboard/supplier-payments" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<Banknote size={20} />} label="Cheques" path="/dashboard/cheques" currentPath={location.pathname} navigate={navigate} />
            </>
          )}

          {hasRole(['Director']) && (
            <>
              <NavItem icon={<FileText size={20} />} label="Reports" path="/dashboard/reports" currentPath={location.pathname} navigate={navigate} />
            </>
          )}

          {hasRole(['Admin']) && (
            <>
              <NavItem icon={<Truck size={20} />} label="Vehicles" path="/dashboard/vehicles" currentPath={location.pathname} navigate={navigate} />
              <NavItem icon={<Cloud size={20} />} label="Cloud Sync" path="/dashboard/cloud-sync" currentPath={location.pathname} navigate={navigate} />
            </>
          )}

          {hasRole(['Admin', 'Director', 'Accountant', 'Store Manager']) && (
            <NavItem icon={<CheckCircle size={20} />} label="Approval Center" path="/dashboard/approvals" currentPath={location.pathname} navigate={navigate} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {hasRole(['Admin']) && (
            <NavItem icon={<Settings size={20} />} label="Settings" path="/dashboard/settings" currentPath={location.pathname} navigate={navigate} />
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors mt-2"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-xl font-semibold text-slate-800"></h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <p className="font-medium text-slate-700">{user?.full_name || 'System User'}</p>
              <p className="text-slate-500">{user?.role || 'Guest'}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
              {user?.username?.substring(0, 2) || 'GU'}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, path, currentPath, navigate }: { icon: React.ReactNode, label: string, path: string, currentPath: string, navigate: (p: string) => void }) {
  const active = currentPath === path;
  return (
    <button 
      onClick={() => navigate(path)}
      className={`w-full flex items-center space-x-3 px-6 py-3 transition-colors text-left ${
        active 
          ? 'bg-blue-600 text-white border-r-4 border-white' 
          : 'hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}


