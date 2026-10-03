import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import tokens from "@/design/tokens.json";
import { defaultLocale } from "@/i18n/config";

/**
 * PWA 매니페스트(ARCHITECTURE §7): 홈 화면에 추가해야 iOS에서 웹푸시를 받을 수 있다.
 * 아이콘은 확정 에셋(image-asset/icon/manifest-icons.json), 바탕은 paper(스플래시), 상단 색은 layout의 viewport가 정한다.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: defaultLocale, namespace: "app" });
  return {
    id: "/",
    name: t("name"),
    short_name: t("name"),
    description: t("description"),
    lang: defaultLocale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: tokens.palette.paper,
    theme_color: tokens.palette.paper,
    icons: [
      { src: "/brand/icon/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/icon/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
