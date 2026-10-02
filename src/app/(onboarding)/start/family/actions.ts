"use server";

import { redirect } from "next/navigation";
import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

export type FamilyFormState = {
  error?: ErrorKey;
  values?: Record<string, string>;
  attempt: number;
};

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** 가족 만들기: 가족 이름 + 내 관계 + (선택) 첫 아이. 성공하면 어르신 초대 단계로. */
export async function createFamily(
  prev: FamilyFormState,
  form: FormData,
): Promise<FamilyFormState> {
  const values = Object.fromEntries(
    ["name", "relation", "relationCustom", "childName", "childStatus", "childDate"].map((k) => [
      k,
      text(form, k),
    ]),
  );
  const relationLabel = values.relation === "custom" ? values.relationCustom : values.relation;
  const wantsChild = Boolean(values.childName || values.childDate);
  const child = wantsChild
    ? {
        // 이름, 태명 칸 하나: 곧 태어나면 태명, 태어났으면 이름
        ...(values.childStatus === "expecting"
          ? { nickname: values.childName || undefined, dueDate: values.childDate || undefined }
          : { name: values.childName || undefined, birthDate: values.childDate || undefined }),
      }
    : undefined;

  let spaceId: string;
  try {
    const caller = await serverCaller();
    const space = await caller.space.create({
      name: values.name,
      relationLabel: relationLabel || undefined,
      child,
    });
    spaceId = space.id;
  } catch (error) {
    return { error: toErrorKey(error), values, attempt: prev.attempt + 1 };
  }
  redirect(`/start/invite/${spaceId}`);
}
