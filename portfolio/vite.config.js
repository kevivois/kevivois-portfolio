import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Permet à Vite d'exposer aussi bien les variables avec ou sans le préfixe VITE_
  envPrefix: ["VITE_", "SUPABASE_", "CARTO_"],
});
