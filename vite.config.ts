import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist", // Standard Vercel output
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT) || 5173, // Fallback to avoid errors
    watch: {
      ignored: ["**/api/**"],
    },
    fs: {
      deny: ["**/api/**"],
    },
  }
});