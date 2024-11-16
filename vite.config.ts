import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5000",
      },
      "/audio": {
        target: "http://localhost:5000",
      },
    },
  },
  build: {
    sourcemap: true,
  },
  clearScreen: false,
  logLevel: "info",
});
