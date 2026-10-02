import type { PrismaClient } from "@/generated/prisma/client";
import type { PushDispatcher } from "@/server/push/dispatch";
import type { MediaStorage } from "@/server/storage/types";

export type Context = {
  prisma: PrismaClient;
  /** 로그인한 봄별 User.id. 비로그인은 null */
  userId: string | null;
  /** 레이트 리밋 키용 클라이언트 IP(Cloudflare cf-connecting-ip) */
  ip: string;
  /** 미디어 저장소(R2). 설정이 없으면 사용할 때 오류 */
  storage: MediaStorage;
  /** 알림(응답 뒤 발송). 발송 설정이 없으면 아무것도 하지 않는다 */
  push: PushDispatcher;
  /**
   * 요청 하나 안에서 같은 권한 조회(사용자, 멤버)를 한 번만 하기 위한 메모(화면 하나가 프로시저를 여러 번 부른다).
   * 요청마다 새로 만든다 - 요청 사이에 공유하지 않는다.
   */
  memo?: Map<string, Promise<unknown>>;
};

/** ctx.memo가 있으면 같은 키의 조회를 한 번만 한다 */
export function memoized<T>(ctx: Pick<Context, "memo">, key: string, load: () => Promise<T>) {
  if (!ctx.memo) return load();
  let hit = ctx.memo.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    ctx.memo.set(key, hit);
  }
  return hit;
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "local";
}
