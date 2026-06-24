import React, { useEffect, useState } from 'react';
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
  CheckCircle,
  Menu,
  X,
  Download,
  HardDriveDownload,
  Navigation
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import MadeByMernCrest from '../components/MadeByMernCrest';
import UpdateBanner from '../components/UpdateBanner';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [apkUrl, setApkUrl] = useState('/erp-app.apk');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installAvailable, setInstallAvailable] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isSidebarOpen]);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const res = await fetch('/version.json');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.apkUrl) {
          setApkUrl(data.apkUrl);
        }
      } catch (e) {
        console.warn('version check failed', e);
      }
    };
    loadVersion();
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      // @ts-ignore
      setInstallPrompt(e);
      setInstallAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateApk = () => {
    window.open(apkUrl || '/erp-app.apk', '_blank');
  };

  const handleInstallApp = async () => {
    if (!installPrompt) {
      alert('Install is not available on this device/browser.');
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallAvailable(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 sidebar-dim z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] md:w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-wider">ERP SYSTEM</h1>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" path="/dashboard" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
          
          {hasRole(['Store Manager']) && (
            <>
              <NavItem icon={<Package size={20} />} label="Products" path="/dashboard/products" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<LayoutDashboard size={20} />} label="Inventory" path="/dashboard/inventory" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<Package size={20} />} label="Receive GRN" path="/dashboard/grn" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<PackageMinus size={20} />} label="Return GRTN" path="/dashboard/grtn" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
            </>
          )}

          {hasRole(['Sales Officer']) && (
            <>
              <NavItem icon={<Users size={20} />} label="Customers" path="/dashboard/customers" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<ShoppingCart size={20} />} label="Sales" path="/dashboard/sales" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
            </>
          )}

          {hasRole(['Director', 'Accountant']) && (
            <>
              <NavItem icon={<Users size={20} />} label="Suppliers" path="/dashboard/suppliers" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<Banknote size={20} />} label="Sup. Payments" path="/dashboard/supplier-payments" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<Banknote size={20} />} label="Cheques" path="/dashboard/cheques" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
            </>
          )}

          {hasRole(['Director']) && (
            <>
              <NavItem icon={<FileText size={20} />} label="Reports" path="/dashboard/reports" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<Navigation size={20} />} label="Live Tracking" path="/dashboard/tracking" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
            </>
          )}

          {hasRole(['Admin']) && (
            <>
              <NavItem icon={<Truck size={20} />} label="Vehicles" path="/dashboard/vehicles" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <NavItem icon={<Cloud size={20} />} label="Cloud Sync" path="/dashboard/cloud-sync" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
            </>
          )}

          {hasRole(['Admin', 'Director', 'Accountant', 'Store Manager']) && (
            <NavItem icon={<CheckCircle size={20} />} label="Approval Center" path="/dashboard/approvals" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {hasRole(['Admin']) && (
            <NavItem icon={<Settings size={20} />} label="Settings" path="/dashboard/settings" currentPath={location.pathname} navigate={navigate} onClick={() => setSidebarOpen(false)} />
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors mt-2"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
          <div className="mt-3 pt-3 border-t border-slate-800">
            <MadeByMernCrest />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <UpdateBanner />
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-30 shrink-0 sticky top-0">
          <div className="flex items-center gap-4 min-w-0">
            <button className="md:hidden text-slate-600 hover:text-slate-900" onClick={toggleSidebar} aria-label="Toggle navigation">
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 truncate">ERP SYSTEM</h2>
          </div>
          <div className="flex items-center space-x-3 md:space-x-6">
            {installAvailable && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 md:px-4 py-2 rounded-full font-semibold transition-colors text-sm border border-blue-200 shadow-sm"
                title="Install as app"
              >
                <HardDriveDownload size={18} />
                <span className="hidden md:inline">Install App</span>
                <span className="md:hidden">Install</span>
              </button>
            )}
            <button
              onClick={handleUpdateApk}
              className="flex items-center gap-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-3 md:px-4 py-2 rounded-full font-semibold transition-colors text-sm border border-emerald-200 shadow-sm"
              title="Update / Download Mobile App"
            >
              <Download size={18} />
              <span className="hidden md:inline">Update Mobile App (APK)</span>
              <span className="md:hidden">Update App</span>
            </button>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="text-sm text-right hidden sm:block">
                <p className="font-medium text-slate-700">{user?.full_name || 'System User'}</p>
                <p className="text-slate-500">{user?.role || 'Guest'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0">
                {user?.username?.substring(0, 2) || 'GU'}
              </div>
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

function NavItem({ icon, label, path, currentPath, navigate, onClick }: { icon: React.ReactNode, label: string, path: string, currentPath: string, navigate: (p: string) => void, onClick?: () => void }) {
  const active = currentPath === path;
  return (
    <button 
      onClick={() => { navigate(path); if (onClick) onClick(); }}
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


