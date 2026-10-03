import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { StoryHome, type QuestionCard } from "@/components/story/story-home";
import { StoryProvider } from "@/components/story/story-state";
import { timeZone } from "@/i18n/config";
import { narratorsOf, parseNarrator, type Narrator } from "@/lib/story-view";
import { authorNames, dayKey } from "@/lib/today-feed";
import { cn } from "@/lib/utils";
import { loadFamily } from "@/server/family";

/**
 * 이야기(별) 탭(DESIGN §9.3, §10.6): 화면 전체가 별 면. 맨 위 질문 카드 하나 → 답을 기다리는 질문 → 이야기 모음.
 * 질문 카드: 어르신께 온 물어보기가 있으면 그것, 없으면 오늘의 질문(아직 답하지 않은 카드 중 날짜로 하나).
 * 부모에게는 어르신께 물어보기(주 행동)와 대신 받아 적기, 어르신과 이야기를 쓰는 부모 자신에게는 답하기.
 */
export default async function StoryPage({ params, searchParams }: PageProps<"/s/[spaceId]/story">) {
  const { spaceId } = await params;
  const family = await loadFamily(spaceId);
  const { space, caller } = family;
  const narrators = narratorsOf(space);
  const me = narrators.find((n) => n.userId === family.userId)!;
  const narratorId = parseNarrator((await searchParams).who, narrators);
  const elders = narrators.filter((n) => n.role === "grandparent");
  const t = await getTranslations("storyTab");

  // 질문 카드의 주인: 내가 어르신이면 나, 부모면 고른 어르신(없으면 첫 어르신, 어르신이 없으면 나)
  const living = (n: Narrator | undefined) => (n && !n.memorial ? n : undefined);
  const cardNarrator =
    me.role === "relative" || me.memorial
      ? undefined
      : me.role === "grandparent"
        ? me
        : (living(elders.find((n) => n.memberId === narratorId)) ??
          elders.find((n) => !n.memorial) ??
          me);

  const [page, asks, prompts] = await Promise.all([
    caller.story.list({ spaceId, narratorMemberId: narratorId ?? undefined }),
    caller.story.asks({ spaceId }),
    cardNarrator
      ? caller.story.prompts({ spaceId, narratorMemberId: cardNarrator.memberId })
      : Promise.resolve([]),
  ]);
  const myAsk = asks.find((a) => a.to.memberId === me.memberId);
  const answered = prompts.filter((p) => p.answered).map((p) => p.key);
  const card: QuestionCard | null =
    myAsk && !me.memorial
      ? { kind: "ask", ask: myAsk }
      : cardNarrator
        ? {
            kind: "prompt",
            mode: cardNarrator.memberId === me.memberId ? "answer" : "elder",
            narratorId: cardNarrator.memberId,
            answered,
          }
        : null;

  // 화자 고르기: 모두 + 어르신들 + 이야기를 남긴 다른 가족(부모 자신의 이야기도 모음에 있다)
  const choices = [
    { id: null as string | null, label: t("all") },
    ...elders.map((n) => ({ id: n.memberId as string | null, label: n.label })),
  ];
  const selected = narrators.find((n) => n.memberId === narratorId);

  return (
    <StoryProvider
      key={narratorId ?? "all"}
      spaceId={spaceId}
      narratorId={narratorId}
      initialItems={page.items}
      initialCursor={page.nextCursor}
      initialAsks={asks}
      narrators={narrators}
      me={me}
      authors={Object.fromEntries(authorNames(space))}
      todayKey={dayKey(new Date(), timeZone)}
    >
      <TabPage
        header={
          <TabTitle>
            {selected ? t("narratorTitle", { name: selected.label }) : space.name}
          </TabTitle>
        }
      >
        {choices.length > 1 ? (
          <nav aria-label={t("whoLabel")} className="mt-2">
            <ul className="flex gap-1 overflow-x-auto rounded-md border-(length:--bw) border-line-strong p-1">
              {choices.map((c) => {
                const on = c.id === narratorId;
                return (
                  <li key={c.id ?? "all"} className="min-w-20 flex-1">
                    <Link
                      href={
                        c.id
                          ? `/s/${spaceId}/story?who=${encodeURIComponent(c.id)}`
                          : `/s/${spaceId}/story`
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
        <StoryHome card={card} />
      </TabPage>
    </StoryProvider>
  );
}
