"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { createInvite, type InviteFormState } from "./actions";

/** 초대 만들기 → 코드와 링크 보여주기 → 보내기(기기 공유) 또는 복사. 카카오톡 공유 SDK는 feat(share) 때. */
/** 한 분 초대가 끝나면 "다른 분도 초대하기"로 처음부터(새 폼 상태) */
export function InviteFlow(props: { spaceId: string; familyName: string }) {
  const [round, setRound] = useState(0);
  return <InviteForm key={round} {...props} onAgain={() => setRound((r) => r + 1)} />;
}

function InviteForm({
  spaceId,
  familyName,
  onAgain,
}: {
  spaceId: string;
  familyName: string;
  onAgain: () => void;
}) {
  const t = useTranslations("onboarding.invite");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState<InviteFormState, FormData>(createInvite, {
    attempt: 0,
  });
  const [notice, setNotice] = useState("");

  if (state.invite) {
    const { code, link, relationLabel } = state.invite;
    const who = relationLabel ?? t("someone");
    const message = t("shareText", { family: familyName });
    const share = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: t("shareTitle"), text: message, url: link });
          setNotice(t("shared"));
          return;
        } catch {
          // 공유 창을 닫은 경우: 아무것도 하지 않는다
          return;
        }
      }
      await copy();
    };
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(`${message}\n${link}`);
        setNotice(t("copied"));
      } catch {
        setNotice(t("copyFailed"));
      }
    };
    return (
      <div className="flex flex-1 flex-col gap-6">
        <p className="text-title-s">{t("ready", { who })}</p>
        <div className="flex flex-col gap-2 rounded-lg bg-bg p-5 text-fg" data-surface="night">
          <p className="text-caption font-bold text-fg-muted">{t("codeLabel")}</p>
          <p
            className="font-heavy text-display tracking-[0.2em] tabular-nums"
            aria-label={code.split("").join(" ")}
          >
            {code}
          </p>
          <p className="text-caption break-all text-fg-muted">{link}</p>
          <p className="text-caption text-fg-muted">{t("expires")}</p>
        </div>
        <p aria-live="polite" className="text-body font-bold empty:hidden">
          {notice}
        </p>
        <div className="mt-auto flex flex-col gap-3">
          <Button variant="primary" size="elder" block onClick={share}>
            {t("send")}
          </Button>
          <Button size="elder" block onClick={copy}>
            {t("copy")}
          </Button>
          <Button variant="text" block onClick={onAgain}>
            {t("again")}
          </Button>
          <Link href="/" className={buttonClass({ variant: "text", block: true })}>
            {t("done")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form key={state.attempt} action={action} className="flex flex-1 flex-col gap-6">
      <input type="hidden" name="spaceId" value={spaceId} />
      <div className="group flex flex-col gap-3">
        <ChoiceChips
          name="relation"
          legend={t("who")}
          defaultValue={state.relation || t("grandma")}
          options={[
            { value: t("grandma"), label: t("grandma") },
            { value: t("grandpa"), label: t("grandpa") },
            { value: t("grandmaMaternal"), label: t("grandmaMaternal") },
            { value: t("grandpaMaternal"), label: t("grandpaMaternal") },
            { value: "custom", label: t("custom") },
          ]}
        />
        <Field
          label={t("customLabel")}
          name="relationCustom"
          maxLength={20}
          className="hidden group-has-[input[value=custom]:checked]:flex"
        />
      </div>
      <p className="text-body text-fg-muted">{t("hint")}</p>
      <p role="alert" className="text-body font-bold empty:hidden">
        {state.error ? te(state.error) : null}
      </p>
      <div className="mt-auto flex flex-col gap-3">
        <Button type="submit" variant="primary" size="elder" block disabled={pending}>
          {pending ? t("creating") : t("create")}
        </Button>
        <Link href="/" className={buttonClass({ variant: "text", block: true })}>
          {t("later")}
        </Link>
      </div>
    </form>
  );
}
