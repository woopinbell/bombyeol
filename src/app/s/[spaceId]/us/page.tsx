import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProfileRows, type ProfileRow } from "@/components/us/profile-rows";
import { StorageMeter } from "@/components/us/storage-meter";
import { UpcomingSection } from "@/components/us/upcoming";
import { timeZone } from "@/i18n/config";
import { childName, dayKey } from "@/lib/today-feed";
import { keepTogether } from "@/lib/utils";
import { zoneOffsetMinutes } from "@/lib/zone";
import { loadFamily } from "@/server/family";

const GENERATIONS = ["grandparent", "parent", "relative"] as const;

/**
 * 우리 탭(DESIGN §9.4): 맨 위 다음 가족 일 → 가족(세대별, 부르는 이름, 별이 되신 분 표식) → 아이와 반려동물
 * → 가족 앨범 저장 공간 → 설정(화면, 초대 관리).
 */
export default async function UsPage({ params }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const { space, role, caller, userId } = await loadFamily(spaceId);
  const now = new Date();
  // 반려동물 커버(짧은 TTL 읽기 URL)는 목록 조회에만 있다
  const [usage, pets, upcoming] = await Promise.all([
    caller.media.usage({ spaceId }),
    space.pets.some((p) => p.coverAssetId) ? caller.pet.list({ spaceId }) : [],
    // 오늘, 시간대 차이는 가족 시간대 기준(한국어만 출시 - i18n/config)
    caller.family.upcoming({
      spaceId,
      today: dayKey(now, timeZone),
      utcOffsetMinutes: zoneOffsetMinutes(timeZone, now),
    }),
  ]);
  const covers = new Map(pets.map((p) => [p.id, p.coverUrl]));
  const t = await getTranslations("usTab");
  const format = await getFormatter();
  const isParent = role === "parent";
  const base = `/s/${space.id}/us`;
  // 날짜만 의미가 있는 값(UTC 자정으로 저장)
  const day = (date: Date) =>
    keepTogether(
      format.dateTime(date, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }),
    );

  const memberRows = (generation: (typeof GENERATIONS)[number]): ProfileRow[] =>
    space.members
      .filter((m) => m.role === generation)
      .map((m) => {
        const me = m.userId === userId;
        return {
          key: m.id,
          name: m.relationLabel ?? m.user.name ?? "",
          detail: m.relationLabel ? m.user.name : null,
          tag: me ? t("me") : null,
          memorial: m.memorial ? t("memorialMember") : null,
          // 나는 내 부르는 이름을, 부모는 모두를 고친다
          href: me || isParent ? `${base}/members/${m.id}` : null,
          action: t("edit"),
        };
      });

  const subjectRows: ProfileRow[] = [
    ...space.children.map((c) => ({
      key: c.id,
      name: childName(c),
      detail:
        c.status === "expecting"
          ? c.dueDate
            ? t("childExpecting", { date: day(c.dueDate) })
            : t("childExpectingNoDate")
          : c.birthDate
            ? t("childBorn", { date: day(c.birthDate) })
            : t("childNoDate"),
      href: isParent ? `${base}/child/${c.id}` : null,
      action: t("edit"),
    })),
    ...space.pets.map((p) => ({
      key: p.id,
      name: p.name,
      cover: covers.get(p.id) ?? null,
      memorial: p.status === "memorial" ? t("memorial") : null,
      detail: p.species === "other" && p.speciesLabel ? p.speciesLabel : t(`species.${p.species}`),
      href: isParent ? `${base}/pet/${p.id}` : null,
      action: t("edit"),
    })),
  ];

  return (
    <TabPage header={<TabTitle>{space.name}</TabTitle>}>
      <div className="flex flex-1 flex-col gap-10 pt-4 pb-12">
        <div className="flex flex-col gap-4">
          <UpcomingSection upcoming={upcoming} />
          <Link href={`${base}/calendar`} className={buttonClass({ block: true })}>
            {t("calendarLink")}
          </Link>
        </div>

        <section aria-labelledby="members-heading" className="flex flex-col gap-4">
          <h2 id="members-heading" className="text-title font-heavy">
            {t("membersTitle")}
          </h2>
          {GENERATIONS.map((g) => {
            const rows = memberRows(g);
            return rows.length ? (
              <div key={g} className="flex flex-col gap-1">
                <h3 className="text-caption font-bold text-fg-muted">{t(`roleGroup.${g}`)}</h3>
                <ProfileRows rows={rows} />
              </div>
            ) : null;
          })}
          {isParent ? (
            <Link
              href={`/start/invite/${space.id}`}
              className={`${buttonClass({ block: true })} text-center text-balance`}
            >
              <Icon name="plus" size="small" />
              {t("invite")}
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="family-heading" className="flex flex-col gap-3">
          <h2 id="family-heading" className="text-title font-heavy">
            {t("familyTitle")}
          </h2>
          {subjectRows.length ? (
            <ProfileRows rows={subjectRows} />
          ) : (
            <p className="text-fg-muted">{t("noFamily")}</p>
          )}
          {space.children
            .filter((c) => c.status === "expecting")
            .map((c) => (
              <Link
                key={c.id}
                href={`${base}/pregnancy/${c.id}`}
                className={buttonClass({ block: true })}
              >
                {t("pregnancyLink", { name: childName(c) })}
              </Link>
            ))}
          {isParent ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`${base}/child/new`} className={buttonClass()}>
                <Icon name="plus" size="small" />
                {t("addChild")}
              </Link>
              <Link href={`${base}/pet/new`} className={buttonClass()}>
                <Icon name="plus" size="small" />
                {t("addPet")}
              </Link>
            </div>
          ) : null}
        </section>

        <StorageMeter
          usedBytes={usage.confirmedBytes + usage.pendingBytes}
          limitBytes={usage.limitBytes}
        />

        <Link href={`${base}/settings`} className={buttonClass({ block: true })}>
          {t("settingsLink")}
        </Link>
      </div>
    </TabPage>
  );
}
