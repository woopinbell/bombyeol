import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // 개발 도구(wrangler·workerd·Prisma CLI·PGlite)가 next.config·prisma.config 경유로
  // 서버 번들 추적에 끌려 들어와 Worker 크기를 키우는 것을 막는다(스파이크 S-4: 53 MiB → 12 MiB).
  outputFileTracingExcludes: {
    "*": [
      "node_modules/wrangler/**",
      "node_modules/workerd/**",
      "node_modules/@cloudflare/**",
      "node_modules/miniflare/**",
      "node_modules/prisma/**",
      "node_modules/@prisma/dev/**",
      "node_modules/@prisma/engines/**",
      "node_modules/@prisma/studio-core/**",
      "node_modules/@electric-sql/**",
      "node_modules/@ast-grep/**",
      "node_modules/esbuild/**",
      "node_modules/@esbuild/**",
      "node_modules/blake3-wasm/**",
      "node_modules/effect/**",
      "node_modules/cloudflare/**",
      "node_modules/typescript/**",
    ],
  },
  images: {
    // 이미지 변환 과금 회피: 썸네일은 업로드 전 클라이언트가 만든다(ARCHITECTURE §1).
    unoptimized: true,
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
