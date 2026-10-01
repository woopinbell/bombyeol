import type { PrismaClient } from "@/generated/prisma/client";
import { PUSH_POLICY } from "@/lib/plan";
import { hitRateLimit } from "@/server/rate-limit";
import { pushText } from "./messages";
import type { NoticeKind, PushSender } from "./types";

export type DeliverRequest = {
  spaceId: string;
  /** 알림을 일으킨 사람 — 자기 자신에게는 보내지 않는다 */
  actorId: string;
  /** 받을 후보(User.id). 발송 직전에 멤버십을 다시 확인해 걸러낸다 */
  userIds: string[];
  /** 역할 제한(임신 기록 parents_only → parent만) */
  roles?: ("parent" | "grandparent" | "relative")[];
  notice: NoticeKind;
  /** 알림을 눌렀을 때 열 경로(`/open/...`). 요청 출처를 붙여 절대 URL로 만든다 */
  path: string;
  data: Record<string, string>;
};

export type DeliverResult = { recipients: number; sent: number; failed: number; pruned: number };

/**
 * 알림 발송의 마지막 관문(ARCHITECTURE §7, PRIVACY §3).
 * - 수신자는 발송 시점에 다시 확인한다: 지금도 그 Space의 멤버(삭제된 Space 제외)이고,
 *   기념 상태가 아니며, 탈퇴한 계정이 아니고, 보낸 사람 본인이 아니어야 한다.
 * - 문구는 종류별 고정 문구만 쓴다(이름·본문·임신 관련 단어 없음).
 * - 수신자당 시간당 상한, 수신자당 기기 수·이벤트당 발송 수 상한(하위 요청 한도).
 * - FCM이 무효라고 답한 토큰은 지운다. 로그에는 개수만 남긴다(PRIVACY §2.7).
 */
export async function deliverPush(
  prisma: PrismaClient,
  sender: PushSender,
  origin: string,
  req: DeliverRequest,
): Promise<DeliverResult> {
  const candidates = [...new Set(req.userIds)].filter((id) => id !== req.actorId);
  const empty = { recipients: 0, sent: 0, failed: 0, pruned: 0 };
  if (candidates.length === 0) return empty;

  const members = await prisma.member.findMany({
    where: {
      spaceId: req.spaceId,
      userId: { in: candidates },
      space: { deletedAt: null },
      user: { deletedAt: null },
      memorial: { is: null },
      ...(req.roles && { role: { in: req.roles } }),
    },
    select: { userId: true, user: { select: { locale: true } } },
  });

  const allowed: { userId: string; locale: string }[] = [];
  for (const m of members) {
    const ok = await hitRateLimit(prisma, `push-recv:${m.userId}`, {
      limit: PUSH_POLICY.perRecipientPerHour,
      windowSec: 60 * 60,
    });
    if (ok) allowed.push({ userId: m.userId, locale: m.user.locale });
  }
  if (allowed.length === 0) return empty;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: allowed.map((a) => a.userId) } },
    orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
    select: { token: true, userId: true },
  });
  const perUser = new Map<string, number>();
  const picked = tokens
    .filter((t) => {
      const n = perUser.get(t.userId) ?? 0;
      perUser.set(t.userId, n + 1);
      return n < PUSH_POLICY.tokensPerRecipient;
    })
    .slice(0, PUSH_POLICY.maxSendsPerEvent);

  const locales = new Map(allowed.map((a) => [a.userId, a.locale]));
  const link = new URL(req.path, origin).toString();
  const outcomes = await Promise.all(
    picked.map((t) => {
      const text = pushText(locales.get(t.userId), req.notice);
      return sender.send(t.token, { ...text, link, data: req.data }).catch(() => "error" as const);
    }),
  );

  const invalid = picked.filter((_, i) => outcomes[i] === "invalid_token").map((t) => t.token);
  if (invalid.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: invalid } } });
  }
  return {
    recipients: new Set(picked.map((t) => t.userId)).size,
    sent: outcomes.filter((o) => o === "ok").length,
    failed: outcomes.filter((o) => o === "error").length,
    pruned: invalid.length,
  };
}
