import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Lock, Bell, Shield, Database, Trash2, Plus } from 'lucide-react';

export default function Settings() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Sales Officer');
  const [newFullName, setNewFullName] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        setUsers(await window.electronAPI.getUsers());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addUser({ username: newUsername, password: newPassword, role: newRole, full_name: newFullName });
        setNewUsername('');
        setNewPassword('');
        setNewFullName('');
        loadUsers();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to add user. Username might already exist.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.deleteUser(id);
        loadUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
          <SettingsIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">System Settings</h1>
          <p className="text-slate-500">Manage your application preferences and configurations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <User size={20} className="text-blue-500" /> User Profile
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50" defaultValue="Admin User" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50" defaultValue="System Administrator" readOnly />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <Lock size={20} className="text-blue-500" /> Security
          </div>
          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex justify-between items-center text-sm font-medium text-slate-700">
              Change Password
              <span className="text-slate-400">→</span>
            </button>
            <button className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex justify-between items-center text-sm font-medium text-slate-700">
              Two-Factor Authentication
              <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded">Disabled</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <Bell size={20} className="text-blue-500" /> Notifications
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-slate-700">Enable Desktop Notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-slate-700">Low Stock Alerts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-slate-700">Cheque Clearance Reminders</span>
            </label>
          </div>
        </div>

        {/* Database & Backup */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <Database size={20} className="text-blue-500" /> Local Database
          </div>
          <p className="text-sm text-slate-600 mb-4">Manage your local SQLite database backups and optimizations.</p>
          <div className="space-y-3">
            <button className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 rounded-lg transition-colors text-sm border border-blue-200">
              Backup Database Now
            </button>
            <button className="w-full bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium py-2 rounded-lg transition-colors text-sm border border-slate-200">
              Optimize Storage (VACUUM)
            </button>
          </div>
        </div>
        {/* Company Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <SettingsIcon size={20} className="text-blue-500" /> Company Information
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" defaultValue="DMS Wholesale Pvt Ltd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Registration No.</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" defaultValue="PV 123456" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" defaultValue="123 Logistics Avenue, Colombo 03" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">Save Details</button>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <SettingsIcon size={20} className="text-blue-500" /> Printers
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Printer</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option>Microsoft Print to PDF</option>
                <option>Epson L3110 Series</option>
                <option>POS Thermal 80mm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode Printer</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option>Zebra Designer ZDesigner</option>
                <option>Microsoft Print to PDF</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-slate-700">Auto-print receipts after checkout</span>
            </label>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-lg border-b border-slate-100 pb-2">
            <SettingsIcon size={20} className="text-blue-500" /> Appearance
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Theme Preference</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" className="w-4 h-4 text-blue-600 focus:ring-blue-500" defaultChecked />
                  <span className="text-sm text-slate-700">Light Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" className="w-4 h-4 text-blue-600 focus:ring-blue-500" disabled />
                  <span className="text-sm text-slate-400">Dark Mode (Pro)</span>
                </label>
              </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Currency Format</label>
               <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                <option>LKR (Sri Lankan Rupee)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
              <Shield size={20} className="text-blue-500" /> User Accounts & Roles
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <table className="w-full text-left border-collapse border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600">Username</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600">Full Name</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600">Role</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 text-sm">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{u.full_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${u.role === 'Director' ? 'bg-purple-100 text-purple-800' : 
                            u.role === 'Admin' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete User">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-sm">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-1"><Plus size={16}/> Add New User</h4>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div>
                  <input type="text" placeholder="Full Name" value={newFullName} onChange={e => setNewFullName(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500 outline-none bg-white">
                    <option>Sales Officer</option>
                    <option>Admin</option>
                    <option>Director</option>
                    <option>Accountant</option>
                    <option>Store Manager</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded text-sm transition-colors mt-2">
                  Create User
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-400 text-sm">
        ERP System Version 1.0.0 &copy; 2026 DMS Wholesale Pvt Ltd
      </div>
    </div>
  );
}
