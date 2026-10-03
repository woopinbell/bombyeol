import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Title } from "@/components/ui/screen";
import { CalendarView } from "@/components/us/calendar-view";
import { timeZone } from "@/i18n/config";
import { monthRange, parseMonth } from "@/lib/month";
import { authorNames, dayKey } from "@/lib/today-feed";
import { zoneOffsetMinutes } from "@/lib/zone";
import { loadFamily } from "@/server/family";

/** 가족 달력: 한 달씩(지난달, 다음 달 링크). 매년 반복 일정은 그 달의 회차로 펼쳐 온다(서버 조회 시점 계산) */
export default async function CalendarPage({
  params,
  searchParams,
}: PageProps<"/s/[spaceId]/us/calendar">) {
  const { spaceId } = await params;
  const { space, role, caller, userId } = await loadFamily(spaceId);
  const now = new Date();
  const todayKey = dayKey(now, timeZone);
  const month = parseMonth((await searchParams).month, todayKey);
  const range = monthRange(month);
  const events = await caller.calendar.list({
    spaceId,
    from: range.from,
    to: range.to,
    utcOffsetMinutes: zoneOffsetMinutes(timeZone, now),
  });
  const t = await getTranslations();
  const format = await getFormatter();
  const base = `/s/${spaceId}/us/calendar`;
  const monthLabel = format.dateTime(new Date(`${range.from}T12:00:00Z`), {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  });
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2 pb-12">
        <Title size="title">{t("calendar.title")}</Title>
        <nav className="flex items-center justify-between gap-2">
          <Link
            href={`${base}?month=${range.prev}`}
            className={buttonClass({ variant: "text" })}
            scroll={false}
          >
            <Icon name="left" size="small" />
            {t("calendar.prev")}
          </Link>
          <h2 className="text-title-s font-bold tabular-nums" aria-live="polite">
            {monthLabel}
          </h2>
          <Link
            href={`${base}?month=${range.next}`}
            className={buttonClass({ variant: "text" })}
            scroll={false}
          >
            {t("calendar.next")}
            <Icon name="right" size="small" />
          </Link>
        </nav>
        <CalendarView
          spaceId={spaceId}
          events={events}
          canWrite={role === "parent" || role === "grandparent"}
          myUserId={userId}
          isParent={role === "parent"}
          authors={Object.fromEntries(authorNames(space))}
          todayKey={todayKey}
        />
      </div>
    </TabPage>
  );
}
