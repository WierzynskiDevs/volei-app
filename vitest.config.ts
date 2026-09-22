/**
 * Config separada do `vite.config.ts` de propósito (CLAUDE.md §22).
 *
 * `vite.config.ts` usa o preset `@lovable.dev/vite-tanstack-config`, que traz o
 * plugin SSR do TanStack Start e o nitro — nenhum dos dois faz sentido rodando
 * teste unitário em jsdom, e o plugin de SSR chega a interferir na resolução de
 * módulo fora do fluxo de build. Reaproveita só o que os testes precisam:
 * `@/` (mesmo alias do app, via `vite-tsconfig-paths`) e JSX de React 19.
 */
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    css: false,
  },
});
