import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { RecordDock } from "@/components/today/record-dock";
import { TodayFeed } from "@/components/today/today-feed";
import { TodayProvider } from "@/components/today/today-state";
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
import { cn } from "@/lib/utils";
import { loadFamily, type Family } from "@/server/family";

/** 마일스톤은 대상별로만 조회된다: 모두면 아이, 반려동물마다 불러 합친다(G-11로 수가 작다) */
async function loadMilestones({ caller, space }: Family, who: Who): Promise<FeedMilestone[]> {
  const subjects = [
    ...space.children.map((c) => ({
      input: { type: "child" as const, childId: c.id },
      name: childName(c),
    })),
    ...space.pets.map((p) => ({ input: { type: "pet" as const, petId: p.id }, name: p.name })),
  ].filter(({ input }) => who.type === "all" || whoParam(who) === whoParam(input));
  const lists = await Promise.all(
    subjects.map(async ({ input, name }) =>
      (await caller.milestone.list({ spaceId: space.id, subject: input })).map((m) => ({
        ...m,
        subjectName: name,
      })),
    ),
  );
  return lists.flat();
}

/** 오늘(봄) 탭: 가족 이름 머리말, 누구의 기록 고르기, 날짜별 앨범 피드 */
export default async function TodayPage({ params, searchParams }: PageProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const family = await loadFamily(spaceId);
  const { space, caller } = family;
  const who = parseWho((await searchParams).who, space);
  const [feed, milestones] = await Promise.all([
    caller.moment.list({ spaceId, subject: whoSubject(who) }),
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

  // 올릴 수 있는 대상(서버 canRecordFor와 같은 규칙): 아이는 parent, 반려동물과 가족 모두는 grandparent도
  const tu = await getTranslations("upload");
  const recordable =
    family.role === "relative"
      ? []
      : [
          ...(family.role === "parent"
            ? space.children.map((c) => ({ value: `child:${c.id}`, label: childName(c) }))
            : []),
          ...space.pets.map((p) => ({ value: `pet:${p.id}`, label: p.name })),
          { value: "family", label: tu("family") },
        ];
  const defaultSubject =
    recordable.find((r) => current && r.value === current)?.value ?? recordable[0]?.value;
  const emptyName = choices.find((c) => current && whoParam(c.who) === current)?.label;

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
      myUserId={family.userId}
      canModerate={family.role === "parent"}
    >
      <TabPage
        header={<TabTitle>{space.name}</TabTitle>}
        dock={
          defaultSubject ? (
            <RecordDock subjects={recordable} defaultSubject={defaultSubject} />
          ) : undefined
        }
      >
        {choices.length > 1 ? (
          <nav aria-label={t("whoLabel")} className="mt-2">
            <ul className="flex gap-1 overflow-x-auto rounded-md border-(length:--bw) border-line-strong p-1">
              {choices.map((c) => {
                const param = whoParam(c.who);
                const on = param === current;
                return (
                  <li key={param ?? "all"} className="min-w-20 flex-1">
                    <Link
                      href={
                        param ? `/s/${spaceId}?who=${encodeURIComponent(param)}` : `/s/${spaceId}`
                      }
                      aria-current={on ? "page" : undefined}
                      scroll={false}
                      data-press=""
                      className={cn(
                        "press flex min-h-(--touch) items-center justify-center rounded-sm px-3 whitespace-nowrap",
                        on ? "bg-strong font-bold text-on-strong" : "font-medium text-fg-muted",
                      )}
                    >
                      {c.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
        <TodayFeed />
      </TabPage>
    </TodayProvider>
  );
}
