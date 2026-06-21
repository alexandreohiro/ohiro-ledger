import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Testes de lib (__tests__) rodam em "node". Testes de componente usam
    // `// @vitest-environment jsdom` no topo do arquivo para sobrescrever.
    include: ["__tests__/**/*.test.ts", "components/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["lib/calculations.ts", "lib/security.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
