"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { revokeInvite } from "@/app/s/[spaceId]/us/settings/actions";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { ConfirmAction } from "./member-manage";

export type InviteRow = {
  id: string;
  code: string;
  role: "parent" | "grandparent" | "relative";
  relationLabel: string | null;
  expiresAt: string;
};

/** 아직 쓰지 않은 초대(parent): 누구에게, 코드, 언제까지. 거두면 그 코드로는 들어올 수 없다 */
export function InviteList({ spaceId, invites }: { spaceId: string; invites: InviteRow[] }) {
  const t = useTranslations("settings");
  const tm = useTranslations("member");
  if (!invites.length) return <p className="text-fg-muted">{t("noInvites")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="flex flex-col gap-3 rounded-md border-(length:--bw-hair) border-line p-4"
        >
          <div>
            <p className="font-bold">{invite.relationLabel ?? tm(`role.${invite.role}`)}</p>
            <p
              className="text-title-s font-heavy tracking-[0.2em] tabular-nums"
              aria-label={invite.code.split("").join(" ")}
            >
              {invite.code}
            </p>
            <Expires at={invite.expiresAt} />
          </div>
          <Revoke spaceId={spaceId} inviteId={invite.id} />
        </li>
      ))}
    </ul>
  );
}

function Expires({ at }: { at: string }) {
  const t = useTranslations("settings");
  const format = useFormatter();
  return (
    <p className="text-caption text-fg-muted">
      {t("expiresAt", {
        date: format.dateTime(new Date(at), {
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      })}
    </p>
  );
}

function Revoke({ spaceId, inviteId }: { spaceId: string; inviteId: string }) {
  const t = useTranslations("settings");
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <ConfirmAction
        label={t("revoke")}
        confirm={t("revokeConfirm")}
        pending={pending}
        onConfirm={() =>
          start(async () => {
            setError(null);
            const result = await revokeInvite(spaceId, inviteId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            toast({ message: t("revoked") });
            router.refresh();
          })
        }
      />
      <p aria-live="polite" className="font-bold empty:hidden">
        {error ? errors(error) : null}
      </p>
    </>
  );
}
