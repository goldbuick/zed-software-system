import path from 'path'

import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'

// https://vitejs.dev/config/
export default defineConfig({
  root: './zss/terminal/',
  plugins: [react(), arraybuffer()],
  resolve: {
    alias: {
      zss: path.resolve(__dirname, './zss'),
    },
  },
})
