import { getTranslations } from "next-intl/server";
import { TabPage, TabTitle } from "@/components/family/tab-page";
import { StoryHome, type QuestionCard } from "@/components/story/story-home";
import { StoryProvider } from "@/components/story/story-state";
import { FilterNav } from "@/components/ui/filter-nav";
import { timeZone } from "@/i18n/config";
import { narratorsOf, parseNarrator, type Narrator } from "@/lib/story-view";
import { authorNames, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/**
 * 이야기(별) 탭(DESIGN §9.3, §10.6): 화면 전체가 별 면. 맨 위 질문 카드 하나 → 답을 기다리는 질문 → 이야기 모음.
 * 모음은 화자(?who=) 또는 반려동물(?pet=)로 거를 수 있다.
 * 질문 카드: 어르신께 온 물어보기가 있으면 그것, 없으면 오늘의 질문(아직 답하지 않은 카드 중 날짜로 하나).
 * 부모에게는 어르신께 물어보기(주 행동)와 대신 받아 적기, 어르신과 이야기를 쓰는 부모 자신에게는 답하기.
 */
export default async function StoryPage({ params, searchParams }: PageProps<"/s/[spaceId]/story">) {
  const { spaceId } = await params;
  const family = await loadFamily(spaceId);
  const { space, caller } = family;
  const narrators = narratorsOf(space);
  const me = narrators.find((n) => n.userId === family.userId)!;
  const query = await searchParams;
  // 반려동물 이야기만 보기(?pet=)는 화자 고르기와 함께 쓰지 않는다
  const pets = space.pets.map((p) => ({ id: p.id, name: p.name }));
  const petId = pets.find((p) => p.id === query.pet)?.id ?? null;
  const narratorId = petId ? null : parseNarrator(query.who, narrators);
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

  const [page, summary, asks, prompts] = await Promise.all([
    caller.story.list({
      spaceId,
      narratorMemberId: narratorId ?? undefined,
      petId: petId ?? undefined,
    }),
    caller.story.summary({
      spaceId,
      narratorMemberId: narratorId ?? undefined,
      petId: petId ?? undefined,
    }),
    caller.story.asks({ spaceId }),
    cardNarrator
      ? caller.story.prompts({ spaceId, narratorMemberId: cardNarrator.memberId })
      : Promise.resolve([]),
  ]);
  // 알림으로 연 물어보기(?open=)가 나에게 온 것이면 그 질문을 카드로
  const mine = asks.filter((a) => a.to.memberId === me.memberId);
  const myAsk = mine.find((a) => a.id === query.open) ?? mine[0];
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
            elder: cardNarrator.role === "grandparent",
          }
        : null;

  // 화자 고르기: 모두 + 어르신들 + 이야기를 남긴 다른 가족(부모 자신의 이야기도 모음에 있다)
  const base = `/s/${spaceId}/story`;
  const choices = [
    { key: "all", href: base, on: !narratorId && !petId, label: t("all") },
    ...elders.map((n) => ({
      key: n.memberId,
      href: `${base}?who=${encodeURIComponent(n.memberId)}`,
      on: n.memberId === narratorId,
      label: n.label,
    })),
    // 반려동물에 붙인 이야기(PRD §4.2.1): 화자 다음에 반려동물 이름
    ...pets.map((p) => ({
      key: p.id,
      href: `${base}?pet=${encodeURIComponent(p.id)}`,
      on: p.id === petId,
      label: p.name,
    })),
  ];
  const selected = narrators.find((n) => n.memberId === narratorId);
  const selectedPet = pets.find((p) => p.id === petId);

  return (
    <StoryProvider
      key={petId ?? narratorId ?? "all"}
      spaceId={spaceId}
      narratorId={narratorId}
      petId={petId}
      pets={pets}
      initialItems={page.items}
      initialCursor={page.nextCursor}
      initialAsks={asks}
      initialSummary={summary}
      narrators={narrators}
      me={me}
      authors={Object.fromEntries(authorNames(space))}
      todayKey={dayKey(new Date(), timeZone)}
    >
      <TabPage
        header={
          <TabTitle>
            {selectedPet
              ? t("petTitle", { name: selectedPet.name })
              : selected
                ? t("narratorTitle", { name: selected.label })
                : space.name}
          </TabTitle>
        }
      >
        {choices.length > 1 ? <FilterNav label={t("whoLabel")} items={choices} /> : null}
        <StoryHome card={card} />
      </TabPage>
    </StoryProvider>
  );
}
