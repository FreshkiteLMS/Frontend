import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules for this project
  {
    rules: {
      // Allow any types for MVP - can be tightened later
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // Allow img elements (can optimize later)
      "@next/next/no-img-element": "warn",
      // Allow setState in effects (common pattern for initialization)
      "react-hooks/set-state-in-effect": "off",
    }
  }
]);

export default eslintConfig;
