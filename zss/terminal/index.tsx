import { StrictMode } from 'react'
import * as ReactDOM from 'react-dom/client'

import { App } from './app'

const root = ReactDOM.createRoot(document.getElementById('engine')!)

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
