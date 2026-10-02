import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { STORY_PROMPTS, type StoryPromptKey } from "./story-prompts";

type Outputs = inferRouterOutputs<AppRouter>;
export type StoryPage = Outputs["story"]["list"];
export type StoryItem = StoryPage["items"][number];
export type StoryCursor = NonNullable<StoryPage["nextCursor"]>;
export type StoryAsk = Outputs["story"]["asks"][number];
type SpaceDetail = Outputs["space"]["get"];

/** 이야기를 들려주는 사람(화자) 고르기용 멤버 */
export type Narrator = {
  memberId: string;
  userId: string;
  role: SpaceDetail["members"][number]["role"];
  /** 가족 안 호칭(할머니), 없으면 가입 이름 */
  label: string;
  memorial: boolean;
};

export function narratorsOf(space: SpaceDetail): Narrator[] {
  return space.members.map((m) => ({
    memberId: m.id,
    userId: m.userId,
    role: m.role,
    label: m.relationLabel ?? m.user.name ?? "",
    memorial: Boolean(m.memorial),
  }));
}

const PROMPT_KEYS = Object.keys(STORY_PROMPTS) as StoryPromptKey[];

/**
 * 오늘의 질문 카드: 아직 답하지 않은 카드 중 날짜로 하나(같은 날에는 같은 카드). 다 답했으면 전체에서 고른다.
 * offset은 [다른 질문]을 누른 횟수.
 */
export function dailyPrompt(
  answered: ReadonlySet<string>,
  dayKey: string,
  offset = 0,
): StoryPromptKey {
  const open = PROMPT_KEYS.filter((k) => !answered.has(k));
  const pool = open.length ? open : PROMPT_KEYS;
  const day = Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
  const index = (((day + offset) % pool.length) + pool.length) % pool.length;
  return pool[index];
}

/** 이야기 탭 화자 고르기 값: 멤버 ID(가족 안의 사람만, 아니면 모두) */
export function parseNarrator(
  value: string | string[] | undefined,
  narrators: Narrator[],
): string | null {
  const raw = typeof value === "string" ? value : "";
  return narrators.some((n) => n.memberId === raw) ? raw : null;
}
