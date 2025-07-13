import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      // Generated Prisma files
      "app/generated/**/*",
      "prisma/generated/**/*", 
      "**/generated/**/*",
      // Other generated/build files
      ".next/**/*",
      "out/**/*",
      "build/**/*",
      "dist/**/*",
      // Dependencies
      "node_modules/**/*",
      // Config files that don't need linting
      "*.config.js",
      "*.config.mjs"
    ]
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),
];
