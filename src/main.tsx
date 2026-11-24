import { createRoot } from 'react-dom/client'
import '@fontsource-variable/cairo'
import '@fontsource-variable/inter'
import './i18n/config'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
