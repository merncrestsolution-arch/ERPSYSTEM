import React, { useState, useEffect } from 'react';
import { Cloud, CloudUpload, Server, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CloudSync() {
  const [dbUrl, setDbUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const settings = await window.electronAPI.getCloudSettings();
        if (settings && settings.postgres_url) {
          setDbUrl(settings.postgres_url);
          setIsConfigured(true);
          setLastSync(settings.last_sync);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim()) return alert('Please enter a valid PostgreSQL URL');
    
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.saveCloudSettings({ postgres_url: dbUrl });
        setIsConfigured(true);
        alert('Cloud database configured successfully!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save settings');
    }
  };

  const handleSync = async () => {
    if (!isConfigured) return alert("Please configure the Cloud Database URL first.");
    
    setIsSyncing(true);
    
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.syncToCloud();
        if (result.success) {
          setLastSync(result.timestamp);
          alert('Synchronization completed successfully!');
        } else {
          alert('Sync Failed: ' + result.error);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert('Sync Failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cloud className="text-blue-600" /> Cloud Synchronization
          </h2>
          <p className="text-slate-500 mt-1">Push your local offline data to a centralized PostgreSQL server for remote access.</p>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle2 size={18} /> Connected to Cloud
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 max-w-5xl">
        
        {/* Settings Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-3 bg-slate-100 rounded-lg"><Server className="text-slate-600" size={24}/></div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Database Configuration</h3>
              <p className="text-sm text-slate-500">Configure your remote Postgres instance</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PostgreSQL Connection URL</label>
              <input 
                type="password" 
                placeholder="postgres://user:password@host:port/dbname" 
                value={dbUrl}
                onChange={e => setDbUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">Example: postgres://postgres:password@aws-rds-host.com:5432/erp_cloud</p>
            </div>
            
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-lg transition-colors">
              Save Configuration
            </button>
          </form>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>Security Warning:</strong> Your connection string contains sensitive credentials. It is stored securely on this local machine. Do not share it.
            </div>
          </div>
        </div>

        {/* Sync Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-100 rounded-lg"><CloudUpload className="text-blue-600" size={24}/></div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Synchronization Engine</h3>
              <p className="text-sm text-slate-500">Push local SQLite updates to the cloud</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <button 
              onClick={handleSync}
              disabled={isSyncing || !isConfigured}
              className={`w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-lg transition-all 
                ${isSyncing ? 'bg-blue-100 border-4 border-blue-300 text-blue-600' : 
                  !isConfigured ? 'bg-slate-100 border-4 border-slate-200 text-slate-400 cursor-not-allowed' : 
                  'bg-blue-600 hover:bg-blue-700 text-white border-4 border-blue-200 hover:scale-105'}`}
            >
              <RefreshCw size={48} className={`mb-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-lg font-bold">{isSyncing ? 'Syncing...' : 'SYNC NOW'}</span>
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 mb-1">Last Synchronized:</p>
              <p className="font-medium text-slate-800">
                {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
