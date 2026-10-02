"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ACCEPT } from "./media-prep";
import { UploadSheet, type SubjectChoice } from "./upload-sheet";
import { DiarySheet, MilestoneSheet } from "./write-sheets";

type Choices = { subjects: SubjectChoice[]; defaultValue: string };

export type RecordOptions = {
  photo: Choices | null;
  diary: Choices | null;
  milestone: Choices | null;
};

type Open = "choose" | "photo" | "diary" | "milestone" | null;

/**
 * 오늘 탭 아래 고정 행동: 화면당 주 버튼 하나 [기록하기](DESIGN §9.2). 고를 것이 둘 이상이면 고르기 시트
 * (사진, 영상 / 일기 / 처음 기록, 키, 몸무게), 하나뿐이면 그 일을 바로 한다. 사진은 기기의 사진 고르기를 바로 연다.
 * 기록할 수 있는 대상이 없는 역할(relative)에는 이 영역이 없다(page가 그리지 않음).
 */
export function RecordDock(options: RecordOptions) {
  const t = useTranslations("record");
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<Open>(null);
  // 시트마다 열 때 seq를 올려 안의 상태를 새로 시작한다(닫히는 동안에는 같은 시트가 남아 내려간다)
  const [seq, setSeq] = useState({ choose: 0, photo: 0, diary: 0, milestone: 0 });
  const [files, setFiles] = useState<File[]>([]);
  const show = (next: Exclude<Open, null>) => {
    setSeq((s) => ({ ...s, [next]: s[next] + 1 }));
    setOpen(next);
  };
  const available = (["photo", "diary", "milestone"] as const).filter((k) => options[k]);
  const pickPhotos = () => input.current?.click();
  const start = (kind: (typeof available)[number]) => {
    if (kind === "photo") {
      setOpen(null);
      pickPhotos();
    } else show(kind);
  };
  const close = () => setOpen(null);
  const only = available.length === 1 ? available[0] : null;
  const ICONS: Record<(typeof available)[number], IconName> = {
    photo: "plus",
    diary: "pen",
    milestone: "spark",
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const picked = [...(e.target.files ?? [])];
          e.target.value = "";
          if (picked.length) {
            setFiles(picked);
            show("photo");
          }
        }}
      />
      <Button variant="primary" block onClick={() => (only ? start(only) : show("choose"))}>
        <Icon name={only ? ICONS[only] : "plus"} size="small" />
        {only ? t(only) : t("open")}
      </Button>

      {seq.choose ? (
        <Sheet open={open === "choose"} onClose={close} title={t("chooseTitle")} size="auto">
          <ul className="flex flex-col gap-3 pb-2">
            {available.map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  data-press=""
                  onClick={() => start(kind)}
                  className={cn(
                    buttonClass({ size: "elder", block: true }),
                    "justify-start gap-3 text-left",
                  )}
                >
                  <Icon name={ICONS[kind]} />
                  <span className="flex flex-col">
                    {t(kind)}
                    <span className="text-caption font-medium text-fg-muted">
                      {t(`${kind}Hint`)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
      {seq.photo && options.photo ? (
        <UploadSheet
          key={`photo-${seq.photo}`}
          open={open === "photo"}
          onClose={close}
          files={files}
          subjects={options.photo.subjects}
          defaultSubject={options.photo.defaultValue}
        />
      ) : null}
      {seq.diary && options.diary ? (
        <DiarySheet
          key={`diary-${seq.diary}`}
          open={open === "diary"}
          onClose={close}
          childChoices={options.diary.subjects}
          defaultChild={options.diary.defaultValue}
        />
      ) : null}
      {seq.milestone && options.milestone ? (
        <MilestoneSheet
          key={`milestone-${seq.milestone}`}
          open={open === "milestone"}
          onClose={close}
          subjects={options.milestone.subjects}
          defaultSubject={options.milestone.defaultValue}
        />
      ) : null}
    </>
  );
}
