/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginSonarJS from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import typescriptEslint from "typescript-eslint";

export default typescriptEslint.config(
    eslint.configs.recommended,
    ...typescriptEslint.configs.recommendedTypeChecked,
    eslintPluginUnicorn.configs["flat/recommended"],
    eslintPluginSonarJS.configs.recommended,
    eslintConfigPrettier,
    {
        plugins: {
            import: eslintPluginImport,
        },
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.eslint.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",

            "dot-notation": "off",
            "@typescript-eslint/dot-notation": "warn",
            "import/no-unresolved": "off",
            "import/extensions": "off",
            "unicorn/prefer-top-level-await": "off",
            "unicorn/no-null": "off",
            "@typescript-eslint/member-ordering": "off",
            "@typescript-eslint/explicit-member-accessibility": "off",
            "@typescript-eslint/no-extra-semi": "error",
            "no-extra-semi": "off",
            "import/order": [
                "error",
                {
                    alphabetize: {
                        caseInsensitive: true,
                        order: "asc",
                    },
                    "newlines-between": "always",
                },
            ],
        },
    },
);
