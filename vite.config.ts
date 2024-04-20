import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import arraybuffer from 'vite-plugin-arraybuffer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: './zss/terminal/',
  plugins: [react(), tsconfigPaths(), arraybuffer()],
  resolve: {
    alias: {
      zss: path.resolve(__dirname, './zss'),
    },
  },
})
