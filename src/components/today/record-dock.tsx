"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ACCEPT } from "./media-prep";
import { UploadSheet, type SubjectChoice } from "./upload-sheet";

/**
 * 오늘 탭 아래 고정 행동(화면당 주 버튼 하나, DESIGN §9.2): 사진 올리기. 누르면 기기의 사진 고르기가 바로 열리고
 * 고른 뒤 올리기 시트가 뜬다. 기록할 수 있는 대상이 없는 역할(relative)에는 이 영역이 없다.
 */
export function RecordDock({
  subjects,
  defaultSubject,
}: {
  subjects: SubjectChoice[];
  defaultSubject: string;
}) {
  const t = useTranslations("upload");
  const input = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<{ files: File[]; seq: number; open: boolean }>({
    files: [],
    seq: 0,
    open: false,
  });
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) setPick((p) => ({ files, seq: p.seq + 1, open: true }));
        }}
      />
      <Button variant="primary" block onClick={() => input.current?.click()}>
        <Icon name="plus" size="small" />
        {t("open")}
      </Button>
      {pick.seq ? (
        <UploadSheet
          key={pick.seq}
          open={pick.open}
          onClose={() => setPick((p) => ({ ...p, open: false }))}
          files={pick.files}
          subjects={subjects}
          defaultSubject={defaultSubject}
        />
      ) : null}
    </>
  );
}
