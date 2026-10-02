import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
// Pretendard(OFL 1.1, Reserved Font Name) — 작성자 배포 dynamic subset을 수정 없이 자체 호스팅(DESIGN.md §4)
import "./fonts/pretendard/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { DISPLAY_PREFS_SCRIPT } from "@/lib/display-prefs";
import tokens from "@/design/tokens.json";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: t("name"), description: t("description") };
}

// 브라우저 상단 색: 기기 테마를 따른다(앱 안 테마 설정과 다를 수 있음)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: tokens.palette.paper },
    { media: "(prefers-color-scheme: dark)", color: tokens.palette["night-deep"] },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    // 첫 페인트 전 스크립트가 <html>에 data-theme·data-text·data-motion을 붙이므로 속성 차이는 허용한다
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_PREFS_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
