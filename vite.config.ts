import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 443, // Required for ngrok HTTPS
    },
    // 👇 This allows any ngrok subdomain to access your dev server
    allowedHosts: [".ngrok-free.app"],
  },
});
