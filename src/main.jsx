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
          borderRadius: '16px',
          border: '1px solid rgba(184, 148, 127, 0.3)',
          background: '#fff9f5',
          color: '#2f2219',
          padding: '12px 14px',
          boxShadow: '0 16px 40px -28px rgba(56, 34, 20, 0.45)',
          fontWeight: 600,
        },
        success: {
          iconTheme: {
            primary: '#b8947f',
            secondary: '#fff9f5',
          },
        },
        error: {
          iconTheme: {
            primary: '#c96c5f',
            secondary: '#fff9f5',
          },
        },
      }}
    />
  </StrictMode>,
)
