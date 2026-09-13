import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/context/ToastContext'
import { PomodoroProvider } from '@/context/PomodoroContext'
import { I18nProvider } from '@/i18n/I18nProvider'
import App from './App'
import '@/styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary variant="app">
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
            <ThemeProvider>
              <ToastProvider>
                <PomodoroProvider>
                  <App />
                </PomodoroProvider>
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
