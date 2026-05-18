import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import path from "path";

export default defineConfig({
  plugins: [react(), glsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@terrain": path.resolve(__dirname, "./src/components/terrain"),
      "@ocean": path.resolve(__dirname, "./src/components/ocean"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@customTypes": path.resolve(__dirname, "./src/types"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
    },
  },
});
