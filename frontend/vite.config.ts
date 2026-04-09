import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import csp from "vite-plugin-csp-guard";

const staticHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

export default defineConfig({
  plugins: [
    react(),
    csp({
      algorithm: "sha256",
      dev: { run: true },
      policy: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": [
          "'self'",
          "ws://localhost:5173",
          "wss://localhost:5173",
          "http://localhost:8000",
        ],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    headers: staticHeaders,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    headers: staticHeaders,
  },
});
