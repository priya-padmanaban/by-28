import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
const config = [
  {
    ignores: [
      ".next/**",
      ".harness/**",
      "reports/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...ts.configs.recommended,
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": hooks },
    rules: { "react-hooks/rules-of-hooks": "error" },
  },
];
export default config;
