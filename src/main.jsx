import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initCapacitorApp } from './utils/capacitorApp'

// Initialize native Capacitor plugins on iOS / mobile
initCapacitorApp();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

