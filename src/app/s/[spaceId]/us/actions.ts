"use server";

import { redirect } from "next/navigation";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

export type ProfileFormState = {
  error?: ErrorKey;
  values?: Record<string, string>;
  attempt: number;
};

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const values = (form: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, text(form, k)]));
/** 비운 칸: 새로 만들 때는 보내지 않고(undefined), 고칠 때는 지운다(null) */
const blank = (value: string) => value || undefined;
const clear = (value: string) => value || null;

/**
 * 아이 더하기, 고치기(parent - 권한은 프로시저가 검사). 이름, 태명 중 하나 이상, 날짜는 비워도 된다.
 * 고칠 때 이미 적은 날짜는 바꿀 수만 있다(빈 칸으로 보내면 그대로 둔다). 곧 태어날 아이의 생일은 markChildBorn으로만.
 */
export async function saveChild(
  spaceId: string,
  childId: string | null,
  prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const v = values(form, ["status", "name", "nickname", "date", "childDataConsent"]);
  try {
    const caller = await serverCaller();
    // 지금 상태(곧 태어나요, 태어났어요)에 따라 날짜 칸이 출생 예정일 또는 생일이다
    const expecting = v.status === "expecting";
    if (childId) {
      await caller.child.update({
        spaceId,
        childId,
        name: clear(v.name),
        nickname: clear(v.nickname),
        ...(expecting ? { dueDate: blank(v.date) } : { birthDate: blank(v.date) }),
      });
    } else {
      await caller.child.create({
        spaceId,
        // 이 가족에서 처음 아이를 등록하는 엄마 아빠는 화면의 아이 정보 동의를 함께 보낸다
        childDataConsent: blank(v.childDataConsent),
        child: {
          status: expecting ? "expecting" : "born",
          name: blank(v.name),
          nickname: blank(v.nickname),
          ...(expecting ? { dueDate: blank(v.date) } : { birthDate: blank(v.date) }),
        },
      });
    }
  } catch (error) {
    return { error: toErrorKey(error), values: v, attempt: prev.attempt + 1 };
  }
  redirect(`/s/${spaceId}/us`);
}

/** 태명 시절 → 태어났어요(parent). 그동안의 기록과 태명은 그대로 둔다 */
export async function markChildBorn(
  spaceId: string,
  childId: string,
  prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const v = values(form, ["birthDate", "name"]);
  try {
    const caller = await serverCaller();
    await caller.child.markBorn({
      spaceId,
      childId,
      birthDate: v.birthDate,
      name: blank(v.name),
    });
  } catch (error) {
    return { error: toErrorKey(error), values: v, attempt: prev.attempt + 1 };
  }
  redirect(`/s/${spaceId}/us`);
}

const PET_KEYS = [
  "name",
  "species",
  "speciesLabel",
  "breed",
  "birthDate",
  "birthDateEstimated",
  "adoptedAt",
];

/** 반려동물 더하기, 고치기(parent). 품종, 날짜는 비워도 되고, 고칠 때 비우면 지운다 */
export async function savePet(
  spaceId: string,
  petId: string | null,
  prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const v = values(form, PET_KEYS);
  const species = (["dog", "cat", "other"] as const).find((s) => s === v.species) ?? "dog";
  const empty = petId ? clear : blank;
  const fields = {
    name: v.name,
    species,
    speciesLabel: species === "other" ? empty(v.speciesLabel) : petId ? null : undefined,
    breed: empty(v.breed),
    birthDate: empty(v.birthDate),
    birthDateEstimated: Boolean(v.birthDate && v.birthDateEstimated),
    adoptedAt: empty(v.adoptedAt),
  };
  try {
    const caller = await serverCaller();
    if (petId) await caller.pet.update({ spaceId, petId, ...fields });
    else await caller.pet.create({ spaceId, ...fields });
  } catch (error) {
    return { error: toErrorKey(error), values: v, attempt: prev.attempt + 1 };
  }
  redirect(`/s/${spaceId}/us`);
}

/**
 * 반려동물 커버 사진 바꾸기, 지우기(parent). 사진은 먼저 올리고 확인된 자산 ID를 넘긴다(G-01~04는 올리기 단계).
 * 이전 커버 파일은 프로시저가 저장소에서 지운다(G-05).
 */
export async function setPetCover(
  spaceId: string,
  petId: string,
  coverAssetId: string | null,
): Promise<{ ok: true } | { error: ErrorKey }> {
  try {
    const caller = await serverCaller();
    await caller.pet.update({ spaceId, petId, coverAssetId });
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

/** 멤버 화면의 바로 하는 일(결과만 돌려준다, 화면은 router.refresh로 다시 받는다) */
type Done = { ok: true } | { error: ErrorKey };

async function run(task: () => Promise<unknown>): Promise<Done> {
  try {
    await task();
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

/** 부르는 이름(관계 표시명): 본인 또는 parent. 비우면 지운다 */
export async function setMemberLabel(spaceId: string, memberId: string, label: string) {
  const caller = await serverCaller();
  return run(() =>
    caller.family.updateLabel({ spaceId, memberId, relationLabel: label.trim() || null }),
  );
}

/** 역할 바꾸기(parent). 역할별 정원(G-11)은 프로시저가 다시 센다 */
export async function setMemberRole(
  spaceId: string,
  memberId: string,
  role: "parent" | "grandparent" | "relative",
) {
  const caller = await serverCaller();
  return run(() => caller.family.changeRole({ spaceId, memberId, role }));
}

/** 내보내기(parent) */
export async function removeMember(spaceId: string, memberId: string) {
  const caller = await serverCaller();
  return run(() => caller.family.remove({ spaceId, memberId }));
}

/** 스스로 나가기. 나가면 이 가족 화면을 볼 수 없으므로 처음 화면으로 */
export async function leaveFamily(spaceId: string): Promise<Done> {
  const caller = await serverCaller();
  const result = await run(() => caller.family.leave({ spaceId }));
  if ("error" in result) return result;
  redirect("/");
}

type MemorialTarget = { type: "member"; memberId: string } | { type: "pet"; petId: string };

/** 별이 되신 분으로(parent, 유가족 동의 하에). 떠난 날, 기억 메모는 비워도 된다 */
export async function markMemorial(
  spaceId: string,
  target: MemorialTarget,
  input: { passedAt: string; note: string },
) {
  const caller = await serverCaller();
  return run(() =>
    caller.memorial.mark({
      spaceId,
      target,
      passedAt: input.passedAt || undefined,
      note: input.note.trim() || undefined,
    }),
  );
}

/** 떠난 날, 기억 메모 고치기(parent). 비우면 지운다 */
export async function updateMemorial(
  spaceId: string,
  memorialId: string,
  input: { passedAt: string; note: string },
) {
  const caller = await serverCaller();
  return run(() =>
    caller.memorial.update({
      spaceId,
      memorialId,
      passedAt: input.passedAt || null,
      note: input.note.trim() || null,
    }),
  );
}

/** 기념 되돌리기(잘못 바꾼 경우, parent). 이야기, 기록은 그대로 */
export async function unmarkMemorial(spaceId: string, memorialId: string) {
  const caller = await serverCaller();
  return run(() => caller.memorial.unmark({ spaceId, memorialId }));
}

/** 아이 지우기(parent, 되돌릴 수 없음). 보이는 이름(이름 또는 태명)을 다시 받아 프로시저가 확인한다 */
export async function deleteChild(spaceId: string, childId: string, confirmName: string) {
  const caller = await serverCaller();
  return run(() => caller.child.delete({ spaceId, childId, confirmName }));
}

/** 반려동물 지우기(parent, 되돌릴 수 없음). 반려동물 이야기는 남는다 */
export async function deletePet(spaceId: string, petId: string, confirmName: string) {
  const caller = await serverCaller();
  return run(() => caller.pet.delete({ spaceId, petId, confirmName }));
}
