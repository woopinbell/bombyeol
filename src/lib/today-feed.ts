import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

type Outputs = inferRouterOutputs<AppRouter>;
export type FeedPage = Outputs["moment"]["list"];
export type FeedMoment = FeedPage["items"][number];
export type FeedCursor = NonNullable<FeedPage["nextCursor"]>;
export type FeedComment = NonNullable<FeedMoment["latestComment"]>;
export type FeedMilestone = Outputs["milestone"]["list"][number] & { subjectName: string };
type SpaceDetail = Outputs["space"]["get"];

/** 오늘 탭 대상 고르기: 모두 / 아이 / 반려동물(가족 전체 대상 기록은 모두에만 보인다) */
export type Who =
  { type: "all" } | { type: "child"; childId: string } | { type: "pet"; petId: string };

export function parseWho(value: string | string[] | undefined, space: SpaceDetail): Who {
  const raw = typeof value === "string" ? value : "";
  const [type, id] = raw.split(":");
  if (type === "child" && space.children.some((c) => c.id === id)) return { type, childId: id };
  if (type === "pet" && space.pets.some((p) => p.id === id)) return { type, petId: id };
  return { type: "all" };
}

export function whoParam(who: Who): string | null {
  if (who.type === "child") return `child:${who.childId}`;
  if (who.type === "pet") return `pet:${who.petId}`;
  return null;
}

/** 아이 이름: 이름이 없으면(태어나기 전) 태명 */
export function childName(child: { name: string | null; nickname: string | null }) {
  return child.name ?? child.nickname ?? "";
}

/** 작성자를 가족 안의 호칭으로(할머니, 엄마). 호칭이 없으면 가입 이름 */
export function authorNames(space: SpaceDetail): Map<string, string> {
  return new Map(space.members.map((m) => [m.userId, m.relationLabel ?? m.user.name ?? ""]));
}

/** 시간대 안의 날짜 키(YYYY-MM-DD) */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 마일스톤 기록일은 날짜만 의미가 있다(UTC 자정으로 저장) */
export function dateOnlyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type FeedDay = {
  key: string;
  milestones: FeedMilestone[];
  moments: FeedMoment[];
};

/**
 * 날짜별 장(B안 날짜별 앨범). 최신 날짜부터, 한 장 안에서는 마일스톤 띠가 먼저, 기록은 받은 순서(촬영 최신순).
 * 마일스톤은 불러온 기록의 가장 오래된 날짜까지만 섞는다 - 더 볼 기록이 남았으면 그보다 오래된 마일스톤은
 * 다음 페이지와 함께 나온다(순서가 뒤섞이지 않게).
 */
export function groupByDay(
  moments: FeedMoment[],
  milestones: FeedMilestone[],
  { timeZone, hasMore }: { timeZone: string; hasMore: boolean },
): FeedDay[] {
  const days = new Map<string, FeedDay>();
  const day = (key: string) => {
    let d = days.get(key);
    if (!d) days.set(key, (d = { key, milestones: [], moments: [] }));
    return d;
  };
  for (const m of moments) day(dayKey(m.takenAt, timeZone)).moments.push(m);
  const oldest = moments.length ? dayKey(moments[moments.length - 1].takenAt, timeZone) : null;
  for (const m of milestones) {
    const key = dateOnlyKey(m.recordedAt);
    if (hasMore && oldest && key < oldest) continue;
    day(key).milestones.push(m);
  }
  return [...days.values()].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

/** 장 제목용 날짜(그 날의 정오 UTC - 어느 시간대에서 읽어도 같은 날) */
export function dayDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

/** 같은 기록이 두 페이지에 걸쳐 오면 한 번만 */
export function appendPage(items: FeedMoment[], page: FeedMoment[]): FeedMoment[] {
  const seen = new Set(items.map((m) => m.id));
  return [...items, ...page.filter((m) => !seen.has(m.id))];
}

/** 대상 고르기 → moment.list의 subject 입력 */
export function whoSubject(who: Who) {
  return who.type === "all" ? undefined : who;
}
