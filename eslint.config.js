import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Test files frequently need partial mock shapes (e.g. Supabase query builder).
    // Forcing precise types in mocks adds noise without runtime safety benefit.
    files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Shadcn UI primitives ship variant constants (CVA) alongside components.
    // React Context providers conventionally co-locate the consumer hook (useAuth, etc.).
    // Both patterns are by design; relax the Fast Refresh rule for these files.
    files: ["src/components/ui/**", "src/contexts/**Context.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
