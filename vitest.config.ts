import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

// Prisma 생성기 runtime="workerd"는 쿼리 컴파일러를 `*.wasm?module`(workerd 규약)로 import한다.
// Node에서 같은 클라이언트를 쓰도록 이를 WebAssembly.Module로 읽어 준다.
function wasmModule(): Plugin {
  return {
    name: "bombyeol:wasm-module",
    enforce: "pre",
    load(id) {
      const [file, query] = id.split("?");
      if (!file?.endsWith(".wasm") || query !== "module") return null;
      const bytes = readFileSync(file).toString("base64");
      return `export default new WebAssembly.Module(Buffer.from(${JSON.stringify(bytes)}, "base64"));`;
    },
  };
}

export default defineConfig({
  plugins: [wasmModule()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // 통합 테스트는 실제(로컬) DB를 쓰므로 원격 DB면 시작 전에 거부한다.
    globalSetup: ["tests/global-setup.ts"],
    // 같은 DB를 공유하는 통합 테스트끼리 간섭하지 않게 파일 단위 병렬을 끈다.
    fileParallelism: false,
  },
});
