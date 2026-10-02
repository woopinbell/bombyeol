import type { PrismaClient } from "@/generated/prisma/client";

/** 기록으로 남기는 것이 의도인 표(id만, 개인정보 없음) */
const KEPT = new Set(["DeletionRequest"]);

async function tablesWith(prisma: PrismaClient, column: string) {
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = ${column}`;
  return rows.map((r) => r.table_name).filter((t) => !KEPT.has(t));
}

/**
 * G-06 잔존 검사: 표 목록을 DB에서 직접 읽어 column = value인 행이 남은 표와 수를 돌려준다(없으면 {}).
 * 앞으로 spaceId·userId 열을 가진 모델이 늘어도 삭제 연쇄에서 빠지면 잡힌다.
 */
export async function leftovers(prisma: PrismaClient, column: string, value: string) {
  const found: Record<string, number> = {};
  for (const table of await tablesWith(prisma, column)) {
    const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `select count(*) as n from "${table}" where "${column}" = $1`,
      value,
    );
    if (Number(n) > 0) found[table] = Number(n);
  }
  return found;
}
