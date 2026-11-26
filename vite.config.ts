import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", emptyOutDir: true },
  server: {
    proxy: {
      "/api": "http://localhost/cap3/learn_with_time_n/api",
      "/uploads": "http://localhost/cap3/learn_with_time_n/api",
      "/cap3/learn_with_time_n/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cap3\/learn_with_time_n/, ""),
      },
    },
  },
});
