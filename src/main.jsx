import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: '14px',
          border: '1px solid rgba(184, 148, 127, 0.25)',
          background: '#fffdfc',
          color: '#2f2219',
          padding: '12px 14px',
        },
      }}
    />
  </StrictMode>,
)
