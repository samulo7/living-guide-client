import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

export default defineConfig({
  plugins: [uni()],
  server: {
    // Expose dev server to LAN so phones/tablets can access it.
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      // Keep API calls same-origin in H5 dev and forward to local backend.
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      // Social images and other uploaded assets are served by backend static route.
      "/uploads": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
