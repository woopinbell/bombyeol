import { redirect } from "next/navigation";
import { getFormatter } from "next-intl/server";
import { FamilyShell } from "@/components/family/family-shell";
import { timeZone } from "@/i18n/config";
import { loadFamily } from "@/server/family";

export default async function FamilyLayout({ children, params }: LayoutProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  const { caller, role } = await loadFamily(spaceId);
  // 삭제 유예 중이면 모든 탭 위에 알린다(쓰기는 서버가 SPACE_DELETING으로 막는다).
  // 약관이 바뀌었거나 동의 화면이 생기기 전에 가입한 분은 동의를 먼저 받는다
  const [deletion, consent] = await Promise.all([
    caller.space.deletionStatus({ spaceId }),
    caller.consent.status({}),
  ]);
  if (consent.account.some((c) => !c.granted)) {
    redirect(`/agree?next=${encodeURIComponent(`/s/${spaceId}`)}`);
  }
  const format = await getFormatter();
  return (
    <FamilyShell
      spaceId={spaceId}
      deletion={
        deletion && {
          purgeOn: format.dateTime(deletion.purgeAfter, {
            timeZone,
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          canManage: role === "parent",
        }
      }
    >
      {children}
    </FamilyShell>
  );
}
