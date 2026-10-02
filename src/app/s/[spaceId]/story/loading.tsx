import { getTranslations } from "next-intl/server";
import { TabSkeleton } from "@/components/family/tab-skeleton";

export default async function Loading() {
  const t = await getTranslations("today");
  return <TabSkeleton label={t("loading")} kind="plain" />;
}
