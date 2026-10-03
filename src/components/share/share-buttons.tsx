"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  absoluteUrl,
  copyShare,
  hasDeviceShare,
  hasKakao,
  shareDevice,
  shareKakao,
  type ShareContent,
} from "@/lib/share";

const noop = () => () => {};

type Label = "kakao" | "otherApps" | "send" | "copy" | "copied" | "copyFailed" | "shared";

/** 보낼 내용. `path`는 같은 출처의 경로(`/open/...`, `/invite/...`) - 누를 때 절대 주소로 바꾼다 */
export type ShareTarget = Omit<ShareContent, "url"> & { path: string };

/**
 * 보내기 단추(ARCHITECTURE §7). 카카오톡이 1급: 키가 있으면 [카카오톡으로 보내기], 실패하면 기기 공유, 복사로 넘어간다.
 * stack: 큰 단추를 세로로(초대처럼 보내기가 화면의 목적일 때) - 카카오톡, 다른 앱(기기 공유가 있으면), 링크 복사.
 * inline: 목록, 시트 안의 글자 단추 하나.
 * 결과 문구는 onNotice로 넘긴다(토스트가 있는 화면, 없는 화면 모두).
 */
export function ShareButtons({
  target,
  variant,
  onNotice,
  inlineLabel,
  labels,
}: {
  target: ShareTarget;
  variant: "stack" | "inline";
  onNotice: (message: string) => void;
  /** inline 단추 이름(카카오톡이 있으면 이 이름, 없으면 "링크 보내기") */
  inlineLabel?: string;
  /** 화면에 맞춘 문구(예: 초대 링크 보내기). 없으면 공통 문구 */
  labels?: Partial<Record<Label, string>>;
}) {
  const common = useTranslations("share");
  const t = (key: Label | "kakaoFailed") => (key !== "kakaoFailed" && labels?.[key]) || common(key);
  const kakao = hasKakao();
  const device = useSyncExternalStore(noop, hasDeviceShare, () => false);
  const [busy, setBusy] = useState(false);

  const content = (): ShareContent => ({ ...target, url: absoluteUrl(target.path) });

  const copy = async () => onNotice((await copyShare(content())) ? t("copied") : t("copyFailed"));

  const viaDevice = async () => {
    if ((await shareDevice(content())) === "shared") onNotice(t("shared"));
  };

  const viaKakao = async () => {
    setBusy(true);
    try {
      await shareKakao(content());
    } catch {
      onNotice(t("kakaoFailed"));
      if (variant === "inline") await (device ? viaDevice() : copy());
    } finally {
      setBusy(false);
    }
  };

  if (variant === "inline") {
    return (
      <Button
        variant="text"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void (kakao ? viaKakao() : device ? viaDevice() : copy())}
      >
        <Icon name="talk" size="small" />
        {kakao ? (inlineLabel ?? t("kakao")) : t("send")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {kakao ? (
        <Button
          variant="primary"
          size="elder"
          block
          disabled={busy}
          aria-busy={busy}
          onClick={() => void viaKakao()}
        >
          {t("kakao")}
        </Button>
      ) : null}
      {device ? (
        <Button
          variant={kakao ? "secondary" : "primary"}
          size="elder"
          block
          onClick={() => void viaDevice()}
        >
          {kakao ? t("otherApps") : t("send")}
        </Button>
      ) : null}
      <Button size="elder" block onClick={() => void copy()}>
        {t("copy")}
      </Button>
    </div>
  );
}
