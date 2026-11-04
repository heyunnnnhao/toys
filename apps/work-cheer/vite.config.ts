import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tauriConfig from './src-tauri/tauri.conf.json' with { type: 'json' }

const devUrl = new URL(tauriConfig.build.devUrl)

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: devUrl.hostname,
    port: Number(devUrl.port),
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
