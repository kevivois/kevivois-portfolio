import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Plugin qui génère physiquement dist/admin/index.html et dist/share/index.html pour garantir 0 erreur 404 au rafraîchissement
function generateAdminHtmlPlugin() {
  return {
    name: "generate-admin-html",
    closeBundle() {
      try {
        const distDir = path.resolve(process.cwd(), "dist");
        const indexPath = path.join(distDir, "index.html");
        const adminDir = path.join(distDir, "admin");
        const shareDir = path.join(distDir, "share");
        if (fs.existsSync(indexPath)) {
          if (!fs.existsSync(adminDir)) {
            fs.mkdirSync(adminDir, { recursive: true });
          }
          fs.copyFileSync(indexPath, path.join(adminDir, "index.html"));

          if (!fs.existsSync(shareDir)) {
            fs.mkdirSync(shareDir, { recursive: true });
          }
          fs.copyFileSync(indexPath, path.join(shareDir, "index.html"));
        }
      } catch (e) {
        console.warn("Notice generateAdminHtmlPlugin:", e);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), generateAdminHtmlPlugin()],
  // Permet à Vite d'exposer aussi bien les variables avec ou sans le préfixe VITE_
  envPrefix: ["VITE_", "SUPABASE_", "CARTO_"],
});
