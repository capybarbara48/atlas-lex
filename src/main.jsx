import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/context/ToastContext'
import App from './App'
import '@/styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary variant="app">
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
