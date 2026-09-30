import { createRoot } from 'react-dom/client'
import { XcassetsApp } from './XcassetsApp'
import './styles.css'

const root = document.getElementById('root')
if (!root) {
  document.body.textContent = 'xcode-types: #root missing'
} else {
  createRoot(root).render(<XcassetsApp />)
}
