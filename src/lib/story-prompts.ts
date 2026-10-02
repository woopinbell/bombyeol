// 이야기(별) 질문 카드 카탈로그(PRD §4.3). 큐레이션은 코드에 두고 문구는 messages의
// story.categories.<category>, story.prompts.<key>에서 찾는다. DB에는 키만 저장한다.
// 키는 저장된 이야기가 참조하므로 바꾸거나 지우지 않는다(문구만 고친다).

export const STORY_CATEGORIES = [
  "childhood", // 어린 시절
  "youth", // 젊은 시절
  "work", // 일
  "love", // 사랑, 결혼
  "parenting", // 자녀 키우기
  "food", // 음식
  "holidays", // 명절, 절기
  "places", // 살던 곳
  "grandchildren", // 손주
  "wisdom", // 전하고 싶은 말
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number];

export const STORY_PROMPTS = {
  childhood_home: "childhood",
  childhood_play: "childhood",
  childhood_school: "childhood",
  childhood_parents: "childhood",
  youth_dream: "youth",
  youth_friend: "youth",
  youth_first_trip: "youth",
  work_first_job: "work",
  work_proud: "work",
  work_hardest: "work",
  love_first_meet: "love",
  love_wedding: "love",
  parenting_first_child: "parenting",
  parenting_hard_times: "parenting",
  parenting_child_memory: "parenting",
  food_mothers_dish: "food",
  food_signature: "food",
  food_hungry_days: "food",
  holidays_chuseok: "holidays",
  holidays_new_year: "holidays",
  places_hometown: "places",
  places_moved: "places",
  grandchildren_birth: "grandchildren",
  grandchildren_wish: "grandchildren",
  wisdom_life_lesson: "wisdom",
  wisdom_happiest: "wisdom",
  wisdom_to_family: "wisdom",
} as const satisfies Record<string, StoryCategory>;

export type StoryPromptKey = keyof typeof STORY_PROMPTS;

export function isStoryPromptKey(key: string): key is StoryPromptKey {
  return Object.hasOwn(STORY_PROMPTS, key);
}

export function isStoryCategory(value: string): value is StoryCategory {
  return (STORY_CATEGORIES as readonly string[]).includes(value);
}
