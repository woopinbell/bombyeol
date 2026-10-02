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
  const v = values(form, ["status", "name", "nickname", "date"]);
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
