import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { loadEnv } from 'vite';

const env = loadEnv('', process.cwd(), '');
const projectName = env.FIREBASE_PROJECT_ID || "default-project-name";
const region = env.FIREBASE_FUNCTIONS_REGION || "region1";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../public",
  },
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:5001/${projectName}/${region}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
