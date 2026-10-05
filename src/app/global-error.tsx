"use client";

// 루트 레이아웃까지 무너졌을 때만 보이는 화면. 레이아웃(글꼴, 문구 공급자)이 없으므로 직접 불러온다.
import "./fonts/pretendard/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import ko from "../../messages/ko.json";
import { Button } from "@/components/ui/button";
import { Lead, Screen, Title } from "@/components/ui/screen";

const t = ko.errorPage;

export default function GlobalError({ retry }: { error: Error; retry: () => void }) {
  return (
    <html lang="ko">
      <body>
        <title>{ko.app.name}</title>
        <Screen
          actions={
            <Button variant="primary" block onClick={() => retry()}>
              {t.retry}
            </Button>
          }
        >
          <Title size="title">{t.title}</Title>
          <Lead>{t.lead}</Lead>
        </Screen>
      </body>
    </html>
  );
}
