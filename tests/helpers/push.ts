import type { PrismaClient } from "@/generated/prisma/client";
import { createPushDispatcher, type PushDispatcher, type PushTask } from "@/server/push/dispatch";
import type { PushMessage, PushSender, SendOutcome } from "@/server/push/types";

export const TEST_ORIGIN = "https://bombyeol.test";

/** 보낸 메시지를 기록하는 가짜 발송기. 토큰별로 결과를 정할 수 있다(기본 ok) */
export class FakeSender implements PushSender {
  sent: { token: string; message: PushMessage }[] = [];
  outcomes = new Map<string, SendOutcome>();

  async send(token: string, message: PushMessage) {
    this.sent.push({ token, message });
    return this.outcomes.get(token) ?? "ok";
  }

  tokens() {
    return this.sent.map((s) => s.token).sort();
  }
}

/**
 * 응답 뒤 작업을 모아 두었다가 flush()에서 실제 디스패처로 실행한다(waitUntil 흉내).
 * 응답과 발송 사이에 생긴 변화(멤버 제외·visibility 변경)를 재현할 수 있게 flush 전에는 시작하지 않는다.
 */
export function testPush(prisma: PrismaClient, sender: PushSender = new FakeSender()) {
  const queued: PushTask[] = [];
  const dispatcher: PushDispatcher = { defer: (task) => void queued.push(task) };
  return {
    dispatcher,
    async flush() {
      while (queued.length > 0) {
        const running: Promise<unknown>[] = [];
        const real = createPushDispatcher({ prisma, sender, origin: TEST_ORIGIN }, (work) =>
          running.push(work),
        );
        for (const task of queued.splice(0)) real.defer(task);
        await Promise.all(running);
      }
    },
  };
}

/** 사용자에게 기기 토큰을 붙인다 */
export async function giveToken(prisma: PrismaClient, userId: string, token = `tok-${userId}`) {
  await prisma.pushToken.create({ data: { userId, token } });
  return token;
}
