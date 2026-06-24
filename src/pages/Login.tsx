import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseAPI } from '../lib/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const cleanedUsername = username.trim();
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const user = await window.electronAPI.loginUser({ username: cleanedUsername, password });
        if (user) {
          login(user);
          navigate('/dashboard');
        } else {
          setError('Invalid username or password');
        }
      } else {
        // Web/PWA: use Supabase if configured
        const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
        if (hasSupabase) {
          const { user, error: supaErr } = await supabaseAPI.loginUser({ username: cleanedUsername, password });
          if (supaErr) {
            setError(`Login error: ${supaErr.message || 'Supabase authentication failed'}`);
            return;
          }
          if (!user) {
            setError('Invalid username or password');
            return;
          }
          login(user);
          navigate('/dashboard');
        } else {
          // Dev fallback only
          if (cleanedUsername === 'admin' && password === 'admin123') {
            login({ id: 1, username: 'admin', role: 'Admin', full_name: 'Admin User' });
            navigate('/dashboard');
          } else {
            setError('Invalid credentials (configure Supabase or run in desktop app).');
          }
        }
      }
    } catch (err) {
      setError('Login failed due to a system error.');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8 border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">ERP System</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to your account</p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="admin"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
