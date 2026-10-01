import type { PrismaClient } from "@/generated/prisma/client";
import { createPushDispatcher, type PushDispatcher } from "@/server/push/dispatch";
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

/** 응답 뒤 작업을 모아 두었다가 flush()로 기다리는 디스패처(waitUntil 흉내) */
export function testPush(prisma: PrismaClient, sender: PushSender = new FakeSender()) {
  const pending: Promise<unknown>[] = [];
  const dispatcher: PushDispatcher = createPushDispatcher(
    { prisma, sender, origin: TEST_ORIGIN },
    (work) => pending.push(work),
  );
  return {
    dispatcher,
    async flush() {
      while (pending.length > 0) await Promise.all(pending.splice(0));
    },
  };
}

/** 사용자에게 기기 토큰을 붙인다 */
export async function giveToken(prisma: PrismaClient, userId: string, token = `tok-${userId}`) {
  await prisma.pushToken.create({ data: { userId, token } });
  return token;
}
