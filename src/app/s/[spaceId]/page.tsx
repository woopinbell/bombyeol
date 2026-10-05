import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { RecordDock } from "@/components/today/record-dock";
import { TodayFeed } from "@/components/today/today-feed";
import { TodayProvider } from "@/components/today/today-state";
import { FilterNav } from "@/components/ui/filter-nav";
import { timeZone } from "@/i18n/config";
import {
  authorNames,
  childName,
  dayKey,
  parseWho,
  whoParam,
  whoSubject,
  type FeedMilestone,
  type Who,
} from "@/lib/today-feed";
import { loadFamily, type Family } from "@/server/family";
import { pagesUntil } from "@/server/open-target";

/** 마일스톤은 한 번에 불러와(milestone.listAll) 대상 이름을 붙인다 */
async function loadMilestones({ caller, space }: Family, who: Who): Promise<FeedMilestone[]> {
  const names = new Map<string, string>([
    ...space.children.map((c) => [c.id, childName(c)] as const),
    ...space.pets.map((p) => [p.id, p.name] as const),
  ]);
  const rows = await caller.milestone.listAll({
    spaceId: space.id,
    subject: who.type === "all" ? undefined : who,
  });
  return rows.map((m) => ({ ...m, subjectName: names.get(m.childId ?? m.petId ?? "") ?? "" }));
}

/** 오늘(봄) 탭: 가족 이름 머리말, 누구의 기록 고르기, 날짜별 앨범 피드 */
export default async function TodayPage({ params, searchParams }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const family = await loadFamily(spaceId);
  const { space, caller } = family;
  const query = await searchParams;
  const who = parseWho(query.who, space);
  const subject = whoSubject(who);
  const open = typeof query.open === "string" ? query.open : null;
  const [feed, milestones] = await Promise.all([
    // 알림으로 연 지난 기록이면 그 기록이 나올 때까지 이어서 불러온다(상한 있음)
    caller.moment
      .list({ spaceId, subject })
      .then((first) =>
        pagesUntil(first, open, (cursor) => caller.moment.list({ spaceId, subject, cursor })),
      ),
    loadMilestones(family, who),
  ]);
  const t = await getTranslations("today");

  const choices = [
    { who: { type: "all" } as Who, label: t("all") },
    ...space.children.map((c) => ({
      who: { type: "child", childId: c.id } as Who,
      label: childName(c),
    })),
    ...space.pets.map((p) => ({ who: { type: "pet", petId: p.id } as Who, label: p.name })),
  ];
  const current = whoParam(who);
  const emptyName = choices.find((c) => current && whoParam(c.who) === current)?.label;

  // 남길 수 있는 기록(서버 canRecordFor와 같은 규칙): 아이 대상은 parent만, 반려동물과 가족 모두는 grandparent도,
  // relative는 열람과 반응만. 별이 된 반려동물에는 새 성장 기록을 남기지 않는다(사진은 남길 수 있다)
  const tu = await getTranslations("upload");
  const isParent = family.role === "parent";
  const canRecord = family.role !== "relative";
  const kids = isParent
    ? space.children.map((c) => ({ value: `child:${c.id}`, label: childName(c) }))
    : [];
  const pets = canRecord ? space.pets.map((p) => ({ value: `pet:${p.id}`, label: p.name })) : [];
  const livingPets = pets.filter((_, i) => space.pets[i].status === "living");
  const pick = (subjects: { value: string; label: string }[]) =>
    subjects.length
      ? {
          subjects,
          defaultValue:
            subjects.find((r) => current && r.value === current)?.value ?? subjects[0].value,
        }
      : null;
  const options = {
    photo: canRecord ? pick([...kids, ...pets, { value: "family", label: tu("family") }]) : null,
    diary: pick(kids),
    milestone: pick([...kids, ...livingPets]),
  };

  return (
    <TodayProvider
      key={current ?? "all"}
      spaceId={spaceId}
      who={who}
      initialItems={feed.items}
      initialCursor={feed.nextCursor}
      milestones={milestones}
      authors={Object.fromEntries(authorNames(space))}
      todayKey={dayKey(new Date(), timeZone)}
      emptyName={emptyName}
      inviteHref={
        isParent && !space.members.some((m) => m.role === "grandparent")
          ? `/start/invite/${spaceId}`
          : undefined
      }
      myUserId={family.userId}
      canModerate={family.role === "parent"}
    >
      <TabPage
        header={<TabTitle>{space.name}</TabTitle>}
        dock={options.photo ? <RecordDock {...options} /> : undefined}
      >
        {choices.length > 1 ? (
          <FilterNav
            label={t("whoLabel")}
            items={choices.map((c) => {
              const param = whoParam(c.who);
              return {
                key: param ?? "all",
                href: param ? `/s/${spaceId}?who=${encodeURIComponent(param)}` : `/s/${spaceId}`,
                on: param === current,
                label: c.label,
              };
            })}
          />
        ) : null}
        <TodayFeed />
      </TabPage>
    </TodayProvider>
  );
}
