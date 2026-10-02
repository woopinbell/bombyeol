import ko from "../../../messages/ko.json";
import type { NoticeKind } from "./types";

const catalogs = { ko } as const;

/** 수신자 locale의 알림 문구. 모르는 locale은 기본(ko) - 출시는 한국어만(ARCHITECTURE §1) */
export function pushText(locale: string | undefined, kind: NoticeKind) {
  const catalog = catalogs[locale as keyof typeof catalogs] ?? catalogs.ko;
  return { title: catalog.push.title, body: catalog.push.body[kind] };
}
