import type { PrismaClient } from "@/generated/prisma/client";
import { timeZone } from "@/i18n/config";
import { zoneOffsetMinutes } from "@/lib/zone";
import { localDate, upcomingFor } from "@/server/family-upcoming";
import { deliverPush } from "@/server/push/deliver";
import type { PushSender } from "@/server/push/types";
import { hitRateLimit } from "@/server/rate-limit";

/**
 * 가족의 날 아침 알림(Q-SCHED, 2026-10-05): 오늘이 아이, 반려동물 생일, 가족이 된 날, 기일, 직접 등록한 생일,
 * 기념일, 또는 가족 모임이 시작하는 날이면 그 가족에게 한 번 알린다. 문구는 고정(이름, 무슨 날인지 없음, PRIVACY §3).
 * 매시 Cron이 부르고 한국 시간 9~11시에만 일한다(앞 회차에서 못 다 한 가족을 다음 회차가 이어서).
 * 가족마다 하루 한 번(DB 카운터로 표시), 한 회차에 가족 수 상한(Workers 하위 요청 한도, COST_GUARDS).
 */
export const DAY_REMINDER = { firstHour: 9, lastHour: 11, spacesPerRun: 40 } as const;

export type DayReminderResult =
  { skipped: "hour" } | { checked: number; notified: number; sent: number };

export async function runDayReminders(
  prisma: PrismaClient,
  sender: PushSender,
  origin: string,
  now: Date = new Date(),
): Promise<DayReminderResult> {
  const offset = zoneOffsetMinutes(timeZone, now);
  const local = new Date(now.getTime() + offset * 60 * 1000);
  const hour = local.getUTCHours();
  if (hour < DAY_REMINDER.firstHour || hour > DAY_REMINDER.lastHour) return { skipped: "hour" };
  const today = localDate(now, false, offset);
  const dayKey = today.toISOString().slice(0, 10);

  // 알림을 받을 수 있는 기기가 하나라도 있는 가족만
  const spaces = await prisma.space.findMany({
    where: { deletedAt: null, members: { some: { user: { pushTokens: { some: {} } } } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  let checked = 0;
  let notified = 0;
  let sent = 0;
  for (const space of spaces) {
    if (checked >= DAY_REMINDER.spacesPerRun) break;
    // 오늘 이 가족을 이미 본 회차가 있으면 건너뛴다(창 2일, 날짜가 키에 들어 있다)
    const first = await hitRateLimit(prisma, `day-reminder:${space.id}:${dayKey}`, {
      limit: 1,
      windowSec: 2 * 24 * 60 * 60,
    });
    if (!first) continue;
    checked++;
    const { cards, nextGathering } = await upcomingFor(prisma, space.id, {
      today,
      utcOffsetMinutes: offset,
      days: 1,
    });
    const gatheringToday =
      nextGathering !== null && nextGathering.date.getTime() === today.getTime();
    if (!cards.some((c) => c.daysUntil === 0) && !gatheringToday) continue;
    const members = await prisma.member.findMany({
      where: { spaceId: space.id },
      select: { userId: true },
    });
    const result = await deliverPush(prisma, sender, origin, {
      spaceId: space.id,
      actorId: "",
      userIds: members.map((m) => m.userId),
      notice: "day",
      path: `/s/${space.id}/us`,
      data: { type: "day" },
    });
    notified++;
    sent += result.sent;
  }
  return { checked, notified, sent };
}
