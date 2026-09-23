import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Cho phép truy cập qua domain ngrok (dev tunnel)
    allowedHosts: true,
    // Proxy API + WebSocket sang backend để FE và BE cùng 1 origin
    // -> chạy được qua ngrok/điện thoại mà không vướng CORS.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (!normalizedId.includes("/node_modules/")) return undefined;

          if (normalizedId.includes("/node_modules/socket.io-client/")) {
            return "realtime-vendor";
          }

          if (
            normalizedId.includes("/node_modules/@radix-ui/") ||
            normalizedId.includes("/node_modules/cmdk/") ||
            normalizedId.includes("/node_modules/vaul/") ||
            normalizedId.includes("/node_modules/sonner/")
          ) {
            return "ui-vendor";
          }

          if (normalizedId.includes("/node_modules/framer-motion/")) {
            return "animation-vendor";
          }

          if (
            normalizedId.includes("/node_modules/leaflet/") ||
            normalizedId.includes("/node_modules/react-leaflet/")
          ) {
            return "map-vendor";
          }

          if (
            normalizedId.includes("/node_modules/recharts/") ||
            normalizedId.includes("/node_modules/d3-")
          ) {
            return "chart-vendor";
          }

          return undefined;
        },
      },
    },
  },
}));
