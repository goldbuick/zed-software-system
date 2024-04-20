import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import arraybuffer from 'vite-plugin-arraybuffer'

// https://vitejs.dev/config/
export default defineConfig({
  root: './zss/terminal/',
  plugins: [react(), tsconfigPaths(), arraybuffer()],
})
