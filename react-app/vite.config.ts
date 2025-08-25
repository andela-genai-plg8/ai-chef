import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
// Removed duplicate import of resolve

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const projectName = env.VITE_FIREBASE_PROJECT_ID || "default-project-name";
  const region = env.VITE_FIREBASE_FUNCTIONS_REGION || "region1";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@components": resolve(__dirname, "src/components"),
        "@pages": resolve(__dirname, "src/pages"),
        "@utils": resolve(__dirname, "src/utils"),
        "@hooks": resolve(__dirname, "src/hooks"),
        "@assets": resolve(__dirname, "src/assets"),
      },
    },
    build: {
      outDir: "../public",
    },
    server: {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:5001/${projectName}/${region}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
