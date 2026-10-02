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
      myUserId={family.userId}
      canModerate={family.role === "parent"}
    >
      <TabPage
        header={<TabTitle>{space.name}</TabTitle>}
        dock={options.photo ? <RecordDock {...options} /> : undefined}
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
