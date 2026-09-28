import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonAuth = new URL(env.NEON_AUTH_BASE_URL)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        // Trailing slash so page routes like /api-keys aren't proxied.
        '/api/': {
          target: env.API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        // Neon Auth is served from this origin so its session cookies are first-party;
        // browsers that block third-party cookies (Safari, Brave) would drop them otherwise.
        '/neon-auth/': {
          target: neonAuth.origin,
          changeOrigin: true,
          cookieDomainRewrite: '',
          rewrite: (p) => p.replace(/^\/neon-auth/, neonAuth.pathname),
        },
      },
    },
  }
})
