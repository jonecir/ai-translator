/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    warnOnUnsupportedTypeScriptVersion: false,
  },

  settings: {
    react: {
      version: "detect",
    },
  },

  plugins: [
    "react",
    "react-hooks",
    "jsx-a11y",
    "@typescript-eslint",
    "prettier",
  ],

  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],

  rules: {
    // React 17+ não exige React em escopo
    "react/react-in-jsx-scope": "off",

    // Não vamos usar PropTypes (vamos confiar em TS / design)
    "react/prop-types": "off",

    // Prettier apenas como aviso
    "prettier/prettier": "warn",

    // Esse hook está reclamando do setState no useEffect -> por enquanto só avisa
    "react-hooks/set-state-in-effect": "warn",

    // Afrouxar TS por enquanto (podemos apertar depois)
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^ignored" },
    ],
  },

  ignorePatterns: [
    "dist/",
    "build/",
    "node_modules/",
    "vite.config.*",
    // ignorar os arquivos Vue antigos
    "src/views/**",
  ],
};
