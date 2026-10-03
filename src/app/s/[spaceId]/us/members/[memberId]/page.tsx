import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import {
  LabelForm,
  LeaveFamily,
  MemorialPanel,
  RemoveMember,
  RoleForm,
  Section,
} from "@/components/us/member-manage";
import { Title } from "@/components/ui/screen";
import { timeZone } from "@/i18n/config";
import { dateOnlyKey, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/**
 * 가족 한 분(나 또는 parent가 보는 화면): 부르는 이름, 역할, 별이 되신 분, 내보내기, 나가기.
 * 바꿀 수 있는지는 서버 규칙과 같다(가족을 만든 분, 나 자신은 역할, 내보내기 대상이 아니다).
 */
export default async function MemberPage({
  params,
}: PageProps<"/s/[spaceId]/us/members/[memberId]">) {
  const { spaceId, memberId } = await params;
  const { role, caller } = await loadFamily(spaceId);
  const [members, memorials] = await Promise.all([
    caller.family.members({ spaceId }),
    caller.memorial.list({ spaceId }),
  ]);
  const member = members.find((m) => m.id === memberId);
  const isParent = role === "parent";
  if (!member || (!member.me && !isParent)) notFound();
  const memorial = memorials.find((m) => m.memberId === member.id) ?? null;
  const name = member.relationLabel ?? member.name ?? "";
  const manageable = isParent && !member.me && !member.creator && !member.memorial;
  const t = await getTranslations();
  const back = `/s/${spaceId}/us`;
  return (
    <TabPage header={<BackLink href={back}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-8 pt-2 pb-12">
        <div className="flex flex-col gap-1">
          <Title size="title">{name}</Title>
          <p className="text-fg-muted">
            {t(`member.role.${member.role}`)}
            {member.name ? <>, {t("member.signedUpAs", { name: member.name })}</> : null}
            {member.creator ? <>, {t("member.creator")}</> : null}
          </p>
        </div>
        {member.memorial ? null : (
          <LabelForm spaceId={spaceId} memberId={member.id} value={member.relationLabel} />
        )}
        {manageable ? <RoleForm spaceId={spaceId} memberId={member.id} role={member.role} /> : null}
        {isParent && !member.me ? (
          <Section title={t("member.memorialTitle")} lead={t("member.memorialLead")}>
            <MemorialPanel
              spaceId={spaceId}
              target={{ type: "member", memberId: member.id }}
              memorial={
                memorial && {
                  id: memorial.id,
                  passedAt: memorial.passedAt ? dateOnlyKey(memorial.passedAt) : null,
                  note: memorial.note,
                }
              }
              todayKey={dayKey(new Date(), timeZone)}
            />
          </Section>
        ) : null}
        {manageable ? (
          <Section title={t("member.removeTitle")} lead={t("member.removeLead")}>
            <RemoveMember spaceId={spaceId} memberId={member.id} name={name} backHref={back} />
          </Section>
        ) : null}
        {member.me && !member.creator ? (
          <Section title={t("member.leaveTitle")} lead={t("member.leaveLead")}>
            <LeaveFamily spaceId={spaceId} />
          </Section>
        ) : null}
      </div>
    </TabPage>
  );
}
