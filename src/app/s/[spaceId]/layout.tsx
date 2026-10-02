import { FamilyShell } from "@/components/family/family-shell";
import { loadFamily } from "@/server/family";

export default async function FamilyLayout({ children, params }: LayoutProps<"/s/[spaceId]">) {
  const { spaceId } = await params;
  await loadFamily(spaceId);
  return <FamilyShell spaceId={spaceId}>{children}</FamilyShell>;
}
