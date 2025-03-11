import js from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

const config = [
  js.configs.recommended,
  ...compat.config({
    root: true,
    env: {
      es6: true,
      node: true,
    },
    extends: [
      "eslint:recommended",
      "next/core-web-vitals",
      "plugin:react/recommended",
      "plugin:prettier/recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "plugin:react/jsx-runtime",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      project: "./tsconfig.json",
    },
    settings: {
      react: {
        pragma: "React",
        version: "detect",
      },
      next: {
        rootDir: "./",
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    plugins: [
      "react",
      "react-hooks",
      "@typescript-eslint",
      "eslint-plugin-import",
      "import",
      "prettier",
    ],
    rules: {
      "prettier/prettier": ["warn", { endOfLine: "auto" }],
      "import/first": "off",
      "import/newline-after-import": "error",
      "import/no-duplicates": ["error", { "prefer-inline": true }],
      "import/no-unresolved": 0,
      "@typescript-eslint/ban-ts-ignore": 0,
      "@typescript-eslint/explicit-function-return-type": 0,
      "@typescript-eslint/explicit-member-accessibility": 0,
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/indent": 0,
      "@typescript-eslint/member-delimiter-style": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-object-literal-type-assertion": 0,
      "@typescript-eslint/no-var-requires": 0,
      "@typescript-eslint/no-floating-promises": 0,
      "@typescript-eslint/await-thenable": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "eol-last": ["error", "always"],
      "no-multiple-empty-lines": "error",
      "comma-dangle": 0,
      "multiline-ternary": 0,
      "no-undef": 0,
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-use-before-define": "off",
      quotes: 0,
      "react/no-unknown-property": [
        "error",
        {
          ignore: ["css", "tw"],
        },
      ],
      "react/no-unescaped-entities": 0,
      "react/prop-types": "off",
      "react/display-name": "off",
      "space-before-function-paren": 0,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-filename-extension": [
        2,
        {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      ],
      "react/jsx-indent": "off",
      "react/jsx-indent-props": "off",
      "@typescript-eslint/unbound-method": ["warn", {}],
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-empty-interface": [
        "warn",
        {
          allowSingleExtends: true,
        },
      ],
      "@typescript-eslint/ban-types": 0,
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "lines-around-comment": "error",
      "newline-before-return": "error",
    },
    overrides: [
      {
        files: ["**/*.tsx"],
        rules: {
          "react/prop-types": "off",
        },
      },
      {
        files: ["src/iconify-bundle/*"],
        rules: {
          "@typescript-eslint/no-var-requires": "off",
        },
      },
    ],
  }),
  {
    ignores: [
      "node_modules/",
      "!.build",
      ".build/*",
      "!.build/test.js",
      "!.next",
      ".next/*",
      ".santity/*",
      ".vercely/*",
      ".vscode/*",
      "dist/*",
      "!.next/test.js",
      "*/**/*.spec.ts",
      "*/**/*.spec.tsx",
      "*/**/*.test.ts",
      "*/**/*.test.tsx",
      "*/**/*.ejs",
      "coverage",
      "src/iconify-bundle/bundle-icons-react.js",
      "src/iconify-bundle/icons-bundle-react",
      "src/iconify-bundle/bundle-icons-react.d.ts",
      "next.config.js",
      ".lintstagedrc.mjs",
    ],
  },
]

export default config
