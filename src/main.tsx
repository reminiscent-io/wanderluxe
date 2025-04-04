
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Redirect www to non-www with https
if (window.location.hostname === 'www.wanderluxe.io') {
  window.location.replace(`https://wanderluxe.io${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById('root')).render(<App />);
}
