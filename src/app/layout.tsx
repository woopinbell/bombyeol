import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "봄별",
  description: "세대를 잇는 우리 가족 아카이브",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
