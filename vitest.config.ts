import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      exclude: ["lib/**/*.test.ts", "lib/__fixtures__/**"],
      reporter: [["text", { skipFull: false }], "html", "lcov"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["components/**/*.test.tsx"],
        },
      },
    ],
  },
});
