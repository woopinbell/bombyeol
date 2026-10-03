"use client";

import { useTranslations } from "next-intl";
import { deleteChild, deletePet } from "@/app/s/[spaceId]/us/actions";
import { DeleteConfirm } from "@/components/us/delete-confirm";

/** 아이, 반려동물 지우기(parent): 이름을 다시 써야 하고, 지우면 우리 탭으로 돌아간다 */
export function DeleteSubject({
  spaceId,
  target,
  name,
}: {
  spaceId: string;
  target: { type: "child" | "pet"; id: string };
  name: string;
}) {
  const t = useTranslations("privacy");
  return (
    <DeleteConfirm
      name={name}
      label={t("confirmNameLabel")}
      hint={t("confirmNameHint", { name })}
      submit={t("subjectDelete", { name })}
      done={t("subjectDeleted")}
      next={`/s/${spaceId}/us`}
      onDelete={(confirmName) =>
        target.type === "child"
          ? deleteChild(spaceId, target.id, confirmName)
          : deletePet(spaceId, target.id, confirmName)
      }
    />
  );
}
