import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabaseAPI } from './lib/supabaseClient'

// Mock Electron IPC bridge using Supabase for Web
// @ts-ignore
window.electronAPI = supabaseAPI;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
