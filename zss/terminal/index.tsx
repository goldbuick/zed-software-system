import React, { StrictMode } from 'react'
import * as ReactDOM from 'react-dom/client'

import { App } from './components/App'

const root = ReactDOM.createRoot(
  document.getElementById('engine') as HTMLElement,
)

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
