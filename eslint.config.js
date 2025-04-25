// eslint.config.js
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import js from "@eslint/js";

export default tseslint.config(
  // Apply core ESLint recommended rules
  js.configs.recommended,

  // Apply TypeScript recommended rules provided by typescript-eslint
  // This automatically configures the TypeScript parser and plugin
  ...tseslint.configs.recommended,

  // Configuration specifically for React (JSX/TSX) files
  {
    files: ["**/*.{jsx,tsx}"], // Target only JSX and TSX files
    plugins: {
      // Enable the React plugin
      react: pluginReact,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
      },
      globals: {
        ...globals.browser, // Define browser environment globals (window, document, etc.)
      },
    },
    rules: {
      // Apply React recommended rules
      ...pluginReact.configs.recommended.rules,
      // Apply rules for the modern JSX runtime (no React import needed)
      ...pluginReact.configs["jsx-runtime"].rules,
      // --- Custom Rule Overrides for React/TSX ---
      // Disable prop-types validation, as TypeScript handles types
      "react/prop-types": "off",
      // Disable requirement to import React when using new JSX transform (usually default now)
      "react/react-in-jsx-scope": "off",
      // Add any other React specific rule overrides here
      // e.g., "react/no-unescaped-entities": "warn",
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
  },

  // Optional: Configuration for general JS/TS files (if needed beyond recommended)
  // You might not need this section if the base recommended configs are enough
  {
    files: ["**/*.{js,ts}"], // Target regular JS and TS files
    languageOptions: {
      globals: {
        ...globals.browser, // Or globals.node if applicable
        ...globals.es2021, // Define ES2021+ globals
      },
    },
    rules: {
      // --- Custom Rule Overrides for JS/TS ---
      // Add any general rule overrides here that apply to both JS and TS
      // "no-console": "warn", // Example: warn on console.log
    },
  },

  // Ignore specific files or directories
  {
    ignores: [
        "node_modules/",
        "dist/", // Ignore build output
        "build/", // Common build output folder
        ".*/**", // Ignore hidden directories like .git, .vscode, .idea etc.
        "*.config.js", // Usually ignore config files themselves (like this one)
        "*.config.cjs",
        // Add any other patterns to ignore
      ],
  }

  /*
  // --- Optional: Configuration for Type-Aware Linting ---
  // This provides more powerful rules but requires tsconfig.json and can be slower.
  // Uncomment and adjust if needed:
  , // Add comma above if uncommenting
  ...tseslint.configs.recommendedTypeChecked, // Use type-aware recommended rules
  {
    languageOptions: {
      parserOptions: {
        project: true, // Point to your tsconfig.json
        tsconfigRootDir: import.meta.dirname, // Usually the project root
      },
    },
    rules: {
      // Add or override type-aware rules here
      // "@typescript-eslint/no-floating-promises": "error", // Example type-aware rule
    }
  }
  */
);