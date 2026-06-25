import { WanixIframeHost } from 'cafe/wanix/wanixiframehost'
import { createRoot } from 'react-dom/client'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<WanixIframeHost />)
}
