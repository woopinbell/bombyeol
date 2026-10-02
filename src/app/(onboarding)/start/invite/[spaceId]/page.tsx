import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Screen, Title } from "@/components/ui/screen";
import { Steps } from "@/components/ui/steps";
import { requireSignedIn } from "@/server/session";
import { serverCaller } from "@/server/trpc/server-caller";
import { InviteFlow } from "./invite-form";

/** 어르신 초대(2/2). 가족 멤버가 아니면 있는지도 드러내지 않는다(404). 초대 발급 권한(parent)은 프로시저가 검사한다. */
export default async function InvitePage({ params }: PageProps<"/start/invite/[spaceId]">) {
  const { spaceId } = await params;
  await requireSignedIn(`/start/invite/${spaceId}`);
  const caller = await serverCaller();
  const space = await caller.space.get({ spaceId }).catch(() => null);
  if (!space) notFound();
  const t = await getTranslations("onboarding");
  return (
    <Screen top={<Steps current={2} total={2} label={t("steps.last")} />}>
      <Title>{t("invite.title")}</Title>
      <InviteFlow spaceId={space.id} familyName={space.name} />
    </Screen>
  );
}
