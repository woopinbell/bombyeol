import { getFormatter, getTranslations } from "next-intl/server";
import type { inferRouterOutputs } from "@trpc/server";
import { Icon } from "@/components/ui/icon";
import type { AppRouter } from "@/server/routers/_app";

type Upcoming = inferRouterOutputs<AppRouter>["family"]["upcoming"];

/**
 * 우리 탭 맨 위 한 초점(DESIGN §9.4): 다음 가족 모임 D-day 카드, 그 아래 앞으로 30일 안의 생일, 기념일, 기일.
 * "D-12" 대신 "12일 뒤"(DESIGN §10.6). 기일은 색이 아니라 별 표식과 글자로 구분한다.
 */
export async function UpcomingSection({ upcoming }: { upcoming: Upcoming }) {
  const t = await getTranslations("usTab");
  const format = await getFormatter();
  // 카드 날짜는 날짜만 의미가 있다(UTC 자정)
  const day = (date: Date) =>
    format.dateTime(date, { timeZone: "UTC", month: "long", day: "numeric", weekday: "short" });
  const { nextGathering, cards } = upcoming;
  const label = (c: Upcoming["cards"][number]) => {
    const name = c.name ?? "";
    const years = c.years ?? 0;
    switch (c.type) {
      case "child_birthday":
        return t("childBirthday", { name, years });
      case "pet_birthday":
        return c.estimated
          ? t("petBirthdayEstimated", { name })
          : t("petBirthday", { name, years });
      case "pet_adoption":
        return t("petAdoption", { name, years });
      case "memorial":
        return t("memorialDay", { name, years });
      default:
        return years > 0 ? t("eventYears", { name, years }) : name;
    }
  };
  return (
    <section aria-labelledby="upcoming-heading" className="flex flex-col gap-4">
      <h2 id="upcoming-heading" className="sr-only">
        {t("upcomingTitle")}
      </h2>
      {nextGathering ? (
        <div data-surface="night" className="flex flex-col gap-1 rounded-lg bg-bg p-5 text-fg">
          <p className="text-caption font-bold text-fg-muted">{t("gathering")}</p>
          <p className="text-display font-heavy tabular-nums">
            {t("inDays", { days: nextGathering.daysUntil })}
          </p>
          <p className="text-title-s font-bold">{nextGathering.title}</p>
          <p className="text-caption text-fg-muted">{day(nextGathering.date)}</p>
        </div>
      ) : null}
      {cards.length ? (
        <ul className="flex flex-col">
          {cards.map((c) => (
            <li
              key={`${c.type}-${c.id}`}
              className="flex min-h-(--touch) items-baseline gap-3 border-b-(length:--bw-hair) border-line py-2"
            >
              <span className="w-16 flex-none font-bold tabular-nums">
                {t("inDays", { days: c.daysUntil })}
              </span>
              <span className="flex-1">
                {c.type === "memorial" ? (
                  <Icon name="star" size="small" className="mr-1 inline align-[-2px]" />
                ) : null}
                {label(c)}
              </span>
              <span className="text-caption text-fg-muted tabular-nums">{day(c.date)}</span>
            </li>
          ))}
        </ul>
      ) : nextGathering ? null : (
        <p className="text-fg-muted">{t("noUpcoming")}</p>
      )}
    </section>
  );
}
