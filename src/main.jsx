import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/sharedModule.css'
import App from './App.jsx'
import { loadAllInstalledFonts } from "./utils/fontInstaller";

loadAllInstalledFonts();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
