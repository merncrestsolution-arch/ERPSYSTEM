import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabaseAPI, supabaseConfigError } from './lib/supabaseClient'

const root = document.getElementById('root')!

if (supabaseConfigError) {
  // Missing Vercel/local env — show a clear message instead of a blank white screen.
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:system-ui,sans-serif;padding:24px;">
      <div style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,.06);">
        <h1 style="margin:0 0 8px;font-size:1.25rem;color:#0f172a;">Configuration required</h1>
        <p style="margin:0 0 16px;color:#475569;line-height:1.5;">${supabaseConfigError}</p>
        <ol style="margin:0;padding-left:1.25rem;color:#334155;line-height:1.6;">
          <li>Open Vercel → Project → Settings → Environment Variables</li>
          <li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
          <li>Redeploy the project</li>
        </ol>
      </div>
    </div>
  `
} else {
  // Mock Electron IPC bridge using Supabase for Web
  // @ts-ignore
  window.electronAPI = supabaseAPI

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
