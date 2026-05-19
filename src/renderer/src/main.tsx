import { ThemeProvider } from 'next-themes'
import './App.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MirrorWindowPage } from './pages/mirror-window'

const urlParams = new URLSearchParams(window.location.search)
const view = urlParams.get('view')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {view === 'mirror' ? <MirrorWindowPage /> : <App />}
    </ThemeProvider>
  </StrictMode>
)
