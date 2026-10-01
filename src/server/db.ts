import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Workers에서는 요청 간 I/O 객체를 공유할 수 없으므로 요청마다 클라이언트를 만든다.
// 연결 풀링은 Hyperdrive가 담당한다(로컬은 wrangler의 localConnectionString).
export function createPrisma() {
  const { env } = getCloudflareContext();
  if (!env.HYPERDRIVE) {
    throw new Error("HYPERDRIVE 바인딩이 설정되지 않았습니다(wrangler.jsonc 해당 env 확인).");
  }
  const adapter = new PrismaPg({ connectionString: env.HYPERDRIVE.connectionString, max: 1 });
  return new PrismaClient({ adapter });
}
