import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WarmupWrapper from './components/WarmupWrapper'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WarmupWrapper>
      <App />
    </WarmupWrapper>
  </StrictMode>,
)
