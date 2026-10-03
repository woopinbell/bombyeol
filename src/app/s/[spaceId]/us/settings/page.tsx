import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Title } from "@/components/ui/screen";
import { DisplaySettings } from "@/components/us/display-settings";
import { InviteList } from "@/components/us/invite-list";
import { NotificationSettings } from "@/components/us/notification-settings";
import { SpaceDeletion } from "@/components/us/space-deletion";
import { timeZone } from "@/i18n/config";
import { DELETION_POLICY } from "@/lib/plan";
import { Section } from "@/components/us/member-manage";
import { loadFamily } from "@/server/family";

/**
 * 설정: 화면(모두, 이 기기) → 알림(이 기기) → 초대 관리(부모: 아직 쓰지 않은 초대, 거두기, 새로 만들기)
 * → 가족 앨범 내려받기(부모) → 가족 지우기(부모: 요청, 유예 중이면 지워질 날과 취소)
 * → 내 계정(모두: 계정 지우기 화면으로)
 */
export default async function SettingsPage({ params }: PageProps<"/s/[spaceId]/us/settings">) {
  const { spaceId } = await params;
  const { role, caller, space } = await loadFamily(spaceId);
  const isParent = role === "parent";
  const [invites, deletion] = isParent
    ? await Promise.all([caller.invite.list({ spaceId }), caller.space.deletionStatus({ spaceId })])
    : [[], null];
  const t = await getTranslations();
  const format = await getFormatter();
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-8 pt-2 pb-12">
        <Title size="title">{t("settings.title")}</Title>
        <Section title={t("settings.displayTitle")}>
          <DisplaySettings />
        </Section>
        <Section title={t("settings.pushTitle")}>
          <NotificationSettings />
        </Section>
        {isParent && !deletion ? (
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
        {isParent && !deletion ? (
          <Section title={t("privacy.export.title")} lead={t("privacy.export.settingsLead")}>
            <Link href={`/s/${spaceId}/us/export`} className={`${buttonClass()} self-start`}>
              {t("privacy.export.settingsLink")}
            </Link>
          </Section>
        ) : null}
        {isParent ? (
          <Section
            title={t("privacy.space.title")}
            lead={
              deletion
                ? undefined
                : t("privacy.space.lead", { days: DELETION_POLICY.spaceGraceDays })
            }
          >
            <SpaceDeletion
              spaceId={spaceId}
              spaceName={space.name}
              purgeOn={
                deletion
                  ? format.dateTime(deletion.purgeAfter, {
                      timeZone,
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : null
              }
            />
          </Section>
        ) : null}
        <Section
          title={t("privacy.account.settingsTitle")}
          lead={t("privacy.account.settingsLead")}
        >
          <Link href="/account/delete" className={`${buttonClass()} self-start`}>
            {t("privacy.account.settingsLink")}
          </Link>
        </Section>
      </div>
    </TabPage>
  );
}
