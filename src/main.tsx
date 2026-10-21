import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import './styles/global.css'

// Keep the installed iOS PWA at its designed scale. iOS Safari may still honor
// gesture zoom despite the viewport meta tag, so block pinch gestures too.
const preventZoomGesture = (event: Event) => event.preventDefault()
document.addEventListener('gesturestart', preventZoomGesture, { passive: false })
document.addEventListener('gesturechange', preventZoomGesture, { passive: false })
document.addEventListener('touchmove', (event: TouchEvent) => {
  if (event.touches.length > 1) event.preventDefault()
}, { passive: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <div >

            <App />
            </div>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// PWA — installable offline shell (production builds only; dev would cache HMR chaos)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
