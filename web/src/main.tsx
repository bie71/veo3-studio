import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App'
import { Toaster } from './lib/toast'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster />
    <App />
  </React.StrictMode>
)
