import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 포맷은 Prettier가 담당하므로 충돌하는 스타일 규칙을 끈다.
  prettier,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "src/generated/**",
    // docs 브랜치 워크트리·링크(main 밖)
    ".docs/**",
    "docs/**",
    "image-asset/**",
  ]),
]);

export default eslintConfig;
