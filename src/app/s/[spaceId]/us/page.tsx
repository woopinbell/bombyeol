import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Lead } from "@/components/ui/screen";
import { childName } from "@/lib/today-feed";
import { cn } from "@/lib/utils";
import { loadFamily } from "@/server/family";

/**
 * 우리 탭. 달력, 구성원 화면은 Phase 5 UI에서 채운다 - 지금은 아이와 반려동물(부모는 더하기, 고치기),
 * 초대 바로가기(부모).
 */
export default async function UsPage({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const { space, role } = await loadFamily(spaceId);
  const t = await getTranslations("usTab");
  const format = await getFormatter();
  const isParent = role === "parent";
  // 날짜만 의미가 있는 값(UTC 자정으로 저장)
  const day = (date: Date) =>
    format.dateTime(date, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

  const rows = [
    ...space.children.map((c) => ({
      key: c.id,
      href: `/s/${space.id}/us/child/${c.id}`,
      name: childName(c),
      detail:
        c.status === "expecting"
          ? c.dueDate
            ? t("childExpecting", { date: day(c.dueDate) })
            : t("childExpectingNoDate")
          : c.birthDate
            ? t("childBorn", { date: day(c.birthDate) })
            : t("childNoDate"),
    })),
    ...space.pets.map((p) => ({
      key: p.id,
      href: `/s/${space.id}/us/pet/${p.id}`,
      name: p.name,
      detail:
        p.status === "memorial"
          ? t("memorial")
          : p.species === "other" && p.speciesLabel
            ? p.speciesLabel
            : t(`species.${p.species}`),
    })),
  ];

  return (
    <TabPage header={<TabTitle>{space.name}</TabTitle>}>
      <div className="flex flex-1 flex-col gap-10 pt-4 pb-12">
        <Lead>{t("empty")}</Lead>

        <section aria-labelledby="family-heading" className="flex flex-col gap-3">
          <h2 id="family-heading" className="text-title font-heavy">
            {t("familyTitle")}
          </h2>
          {rows.length ? (
            <ul className="flex flex-col">
              {rows.map((row) => {
                const body = (
                  <>
                    <span className="flex flex-1 flex-col">
                      <span className="font-bold">{row.name}</span>
                      {row.detail ? (
                        <span className="text-caption text-fg-muted">{row.detail}</span>
                      ) : null}
                    </span>
                    {isParent ? (
                      <span className="inline-flex items-center gap-1 text-caption font-bold text-fg-muted">
                        {t("edit")}
                        <Icon name="right" size="small" />
                      </span>
                    ) : null}
                  </>
                );
                const rowClass =
                  "flex min-h-(--touch-elder) items-center gap-3 border-b-(length:--bw-hair) border-line py-2";
                return (
                  <li key={row.key}>
                    {isParent ? (
                      <Link href={row.href} data-press="" className={cn("press", rowClass)}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("noFamily")}</p>
          )}
          {isParent ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/s/${space.id}/us/child/new`} className={buttonClass()}>
                <Icon name="plus" size="small" />
                {t("addChild")}
              </Link>
              <Link href={`/s/${space.id}/us/pet/new`} className={buttonClass()}>
                <Icon name="plus" size="small" />
                {t("addPet")}
              </Link>
            </div>
          ) : null}
        </section>

        {isParent ? (
          <Link href={`/start/invite/${space.id}`} className={buttonClass({ block: true })}>
            {t("invite")}
          </Link>
        ) : null}
      </div>
    </TabPage>
  );
}
