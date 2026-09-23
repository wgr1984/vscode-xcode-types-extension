import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = document.getElementById('root')
if (!root) {
  document.body.textContent = 'xcode-types: #root missing'
} else {
  createRoot(root).render(<App />)
}
