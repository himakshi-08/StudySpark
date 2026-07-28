import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server proxies /api requests to our Express backend
// so the frontend can call same-origin "/api/generate" in dev and prod alike.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
