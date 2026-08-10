import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MadeByMernCrest from '../components/MadeByMernCrest';
import BrandLogo from '../components/BrandLogo';
import TurnstileBackground from '../components/TurnstileBackground';
import { isTurnstileEnabled, type TurnstileHandle } from '../lib/turnstile';
import { COMPANY } from '../lib/companyProfile';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const cleanedUsername = username.trim();

    try {
      let turnstileToken = '';
      if (isTurnstileEnabled()) {
        turnstileToken = await turnstileRef.current!.execute();
        if (!turnstileToken) {
          throw new Error('Security check failed. Please try again.');
        }
      }

      // @ts-ignore
      const api = window.electronAPI;
      if (!api) {
        setError('Login service is unavailable. Please reload the app.');
        turnstileRef.current?.reset();
        return;
      }

      const user = await api.loginUser({
        username: cleanedUsername,
        password,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      if (user && user.role) {
        login(user);
        navigate('/dashboard');
      } else {
        turnstileRef.current?.reset();
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login failed:', err);
      turnstileRef.current?.reset();
      setError(err instanceof Error ? err.message : 'Login failed due to a system error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-100 p-4">
      <TurnstileBackground
        ref={turnstileRef}
        onError={(msg) => setError(msg)}
      />
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 sm:p-8 border border-slate-200 relative">
        <div className="text-center mb-8">
          <BrandLogo variant="full" imgClassName="h-28 sm:h-32 w-auto mx-auto mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            {COMPANY.productName}
          </p>
          <p className="text-sm text-slate-500">Sign in to your account</p>
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
              disabled={busy}
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
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <MadeByMernCrest />
        </div>
      </div>
    </div>
  );
}
