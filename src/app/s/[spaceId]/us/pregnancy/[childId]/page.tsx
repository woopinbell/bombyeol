import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/family/back-link";
import { TabPage } from "@/components/family/tab-page";
import { Title } from "@/components/ui/screen";
import {
  AddRecord,
  ConsentCard,
  RecordList,
  WithdrawConsent,
} from "@/components/us/pregnancy-view";
import { timeZone } from "@/i18n/config";
import { authorNames, childName, dayKey } from "@/lib/today-feed";
import { loadFamily } from "@/server/family";

/**
 * 임신 기록(PRD §4.2, PRIVACY §3): 오늘의 주차와 태어날 날까지, 기록 목록. 서버가 보이는 것만 준다 -
 * parent가 아니면 가족 공개 기록만(숨은 기록 수도 드러내지 않음). 쓰기는 별도 동의한 parent.
 */
export default async function PregnancyPage({
  params,
}: PageProps<"/s/[spaceId]/us/pregnancy/[childId]">) {
  const { spaceId, childId } = await params;
  const { space, role, caller, userId } = await loadFamily(spaceId);
  const child = space.children.find((c) => c.id === childId);
  if (!child) notFound();
  const isParent = role === "parent";
  const todayKey = dayKey(new Date(), timeZone);
  const [progress, page, consent] = await Promise.all([
    caller.pregnancy.progress({ spaceId, childId, today: todayKey }),
    caller.pregnancy.list({ spaceId, childId }),
    isParent ? caller.consent.status({ spaceId }) : null,
  ]);
  const consented = Boolean(consent?.space?.find((c) => c.kind === "pregnancy")?.granted);
  const t = await getTranslations();
  const age = progress.gestationalAge;
  return (
    <TabPage header={<BackLink href={`/s/${spaceId}/us`}>{t("usTab.back")}</BackLink>}>
      <div className="flex flex-col gap-6 pt-2 pb-12">
        <Title size="title">{t("pregnancy.title", { name: childName(child) })}</Title>
        {progress.status === "expecting" ? (
          <div data-surface="night" className="flex flex-col gap-1 rounded-lg bg-bg p-5 text-fg">
            {age ? (
              <p className="text-display font-heavy tabular-nums">{t("pregnancy.today", age)}</p>
            ) : null}
            <p className="font-bold">
              {progress.daysUntilDue === null
                ? t("pregnancy.noDue")
                : progress.daysUntilDue >= 0
                  ? t("pregnancy.daysUntilDue", { days: progress.daysUntilDue })
                  : t("pregnancy.overdue", { days: -progress.daysUntilDue })}
            </p>
          </div>
        ) : null}
        {isParent && !consented ? <ConsentCard spaceId={spaceId} /> : null}
        {isParent && consented ? (
          <AddRecord spaceId={spaceId} childId={childId} todayKey={todayKey} />
        ) : null}
        <RecordList
          spaceId={spaceId}
          childId={childId}
          todayKey={todayKey}
          records={page.items}
          isParent={isParent}
          canWrite={isParent && consented}
          myUserId={userId}
          authors={Object.fromEntries(authorNames(space))}
        />
        {isParent && consented ? <WithdrawConsent spaceId={spaceId} /> : null}
      </div>
    </TabPage>
  );
}
