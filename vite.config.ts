import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '')
  return {
    plugins: [react()],
    define: {
      // This allows the existing code using process.env.API_KEY to work
      // by injecting the Vercel Environment Variable at build time.
      // Priority: Environment Variable > Hardcoded Key
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyCR6V78BADSUG6kl4VjxCbOQrsOPbov2Rc"),
    },
    build: {
      target: 'esnext'
    }
  }
})