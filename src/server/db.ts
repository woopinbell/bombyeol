import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Workers에서는 요청 간 I/O 객체를 공유할 수 없으므로 요청마다 클라이언트를 만든다.
// 연결 풀링은 Hyperdrive가 담당한다.
export function createPrisma() {
  const { env } = getCloudflareContext();
  const connectionString = env.HYPERDRIVE.connectionString;
  const adapter = new PrismaPg({ connectionString, max: 1 });
  return new PrismaClient({ adapter });
}
