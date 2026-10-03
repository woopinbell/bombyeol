import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Title } from "@/components/ui/screen";
import { DisplaySettings } from "@/components/us/display-settings";
import { InviteList } from "@/components/us/invite-list";
import { Section } from "@/components/us/member-manage";
import { loadFamily } from "@/server/family";

/** 설정: 화면(모두, 이 기기) → 초대 관리(부모: 아직 쓰지 않은 초대, 거두기, 새로 만들기) */
export default async function SettingsPage({ params }: PageProps<"/s/[spaceId]/us/settings">) {
  const { spaceId } = await params;
  const { role, caller } = await loadFamily(spaceId);
  const isParent = role === "parent";
  const invites = isParent ? await caller.invite.list({ spaceId }) : [];
  const t = await getTranslations();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-8 pt-2 pb-12">
        <Title size="title">{t("settings.title")}</Title>
        <Section title={t("settings.displayTitle")}>
          <DisplaySettings />
        </Section>
        {isParent ? (
          <Section title={t("settings.invitesTitle")} lead={t("settings.invitesLead")}>
            <InviteList
              spaceId={spaceId}
              invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
            />
            <Link href={`/start/invite/${spaceId}`} className={`${buttonClass()} self-start`}>
              <Icon name="plus" size="small" />
              {t("settings.newInvite")}
            </Link>
          </Section>
        ) : null}
      </div>
    </TabPage>
  );
}
