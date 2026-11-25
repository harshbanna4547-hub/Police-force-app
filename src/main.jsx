import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './index.css'
import './shared/sharedModule.css'
import App from './App.jsx'
import { loadAllInstalledFonts } from "./utils/fontInstaller";

const root = createRoot(document.getElementById('root'));
const renderApp = () => root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

loadAllInstalledFonts().then(renderApp).catch((error) => {
  console.error("Installed fonts could not be loaded before startup:", error);
  renderApp();
});
