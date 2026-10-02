"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createDiary, createMilestone } from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { MILESTONE_KINDS, kindInfo } from "@/lib/milestone-kinds";
import { MOMENT_POLICY } from "@/lib/plan";
import type { SubjectChoice } from "./upload-sheet";
import { useToday } from "./today-state";

const draftKey = (spaceId: string) => `bombyeol.draft.diary.${spaceId}`;

function readDraft(spaceId: string) {
  try {
    return localStorage.getItem(draftKey(spaceId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(spaceId: string, value: string) {
  try {
    if (value) localStorage.setItem(draftKey(spaceId), value);
    else localStorage.removeItem(draftKey(spaceId));
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드)에서는 초안 없이 쓴다
  }
}

/**
 * 부모 일기(PRD §4.2): 아이 한 명에게 남기는 짧은 글. 쓰는 중인 글은 이 기기에 초안으로 남는다
 * (닫거나 실패해도 사라지지 않게, DESIGN §9.1-6). 올리면 초안을 지운다.
 */
export function DiarySheet({
  open,
  onClose,
  childChoices,
  defaultChild,
}: {
  open: boolean;
  onClose: () => void;
  childChoices: SubjectChoice[];
  defaultChild: string;
}) {
  const t = useTranslations("diary");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const { spaceId, addMoment } = useToday();
  // 시트는 누른 뒤에만 그려지므로(서버 렌더 없음) 초안을 바로 읽어도 된다
  const [body, setBody] = useState(() => readDraft(spaceId));
  const [error, setError] = useState<ErrorKey | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (form: FormData) => {
    const text = body.trim();
    if (!text) {
      setError("BODY_REQUIRED");
      return;
    }
    setError(null);
    setSending(true);
    const childId = String(form.get("child") ?? defaultChild).split(":")[1];
    const created = await createDiary(spaceId, { childId, body: text });
    setSending(false);
    if ("error" in created) {
      setError(created.error);
      return;
    }
    writeDraft(spaceId, "");
    setBody("");
    addMoment({ ...created, reactions: { likes: 0, comments: 0, likedByMe: false } });
    toast({ message: t("done") });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={
        <Button
          type="submit"
          form="diary-form"
          variant="primary"
          size="elder"
          block
          disabled={sending}
          aria-busy={sending}
        >
          {t("submit")}
        </Button>
      }
    >
      <form
        id="diary-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-6 pb-2"
      >
        {childChoices.length > 1 ? (
          <ChoiceChips
            name="child"
            legend={t("child")}
            options={childChoices}
            defaultValue={defaultChild}
          />
        ) : null}
        <TextArea
          label={t("body")}
          hint={t("draftHint")}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            writeDraft(spaceId, e.target.value);
          }}
          maxLength={MOMENT_POLICY.bodyMaxChars}
          error={error ? errors(error) : undefined}
        />
      </form>
    </Sheet>
  );
}

/**
 * 처음 기록, 키, 몸무게 같은 마일스톤(PRD §4.2). 누구 → 무엇 → (값) → 날짜. "처음" 기록은 대상당 하나라
 * 이미 있으면 서버가 알려 준다. 별이 된 반려동물은 고를 수 없다(서버도 막는다).
 */
export function MilestoneSheet({
  open,
  onClose,
  subjects,
  defaultSubject,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectChoice[];
  defaultSubject: string;
}) {
  const t = useTranslations("milestoneSheet");
  const kinds = useTranslations("milestoneKind");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const { spaceId, todayKey, addMilestone } = useToday();
  const [subject, setSubject] = useState(defaultSubject);
  const type = subject.startsWith("child:") ? "child" : "pet";
  const [kind, setKind] = useState<string>(type === "child" ? "first_step" : "first_walk");
  const info = kindInfo(type, kind);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (form: FormData) => {
    if (!info) return;
    setError(null);
    const note = String(form.get("note") ?? "").trim() || undefined;
    let value: Record<string, unknown> = { note };
    if (info.input === "measure") {
      const n = Number(String(form.get("value") ?? "").replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setError("MILESTONE_VALUE_INVALID");
        return;
      }
      value = { value: n, note };
    } else if (info.input === "title") {
      const title = String(form.get("title") ?? "").trim();
      if (!title) {
        setError("BODY_REQUIRED");
        return;
      }
      value = { title, note };
    }
    const id = subject.split(":")[1];
    setSending(true);
    const created = await createMilestone(spaceId, {
      subject: type === "child" ? { type, childId: id } : { type, petId: id },
      kind,
      value,
      recordedAt: String(form.get("date") || todayKey),
    });
    setSending(false);
    if ("error" in created) {
      setError(created.error);
      return;
    }
    addMilestone({
      ...created,
      subjectName: subjects.find((s) => s.value === subject)?.label ?? "",
      reactions: { likes: 0, comments: 0, likedByMe: false },
    });
    toast({ message: t("done") });
    onClose();
  };

  const kindOptions = Object.keys(MILESTONE_KINDS[type]).map((k) => ({
    value: k,
    label: kinds(`${type}.${k}` as Parameters<typeof kinds>[0]),
  }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={
        <Button
          type="submit"
          form="milestone-form"
          variant="primary"
          size="elder"
          block
          disabled={sending}
          aria-busy={sending}
        >
          {t("submit")}
        </Button>
      }
    >
      <form
        id="milestone-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        onChange={(e) => {
          const el = e.target as unknown as HTMLInputElement;
          if (el.name === "subject") {
            setSubject(el.value);
            setKind(el.value.startsWith("child:") ? "first_step" : "first_walk");
          }
          if (el.name === "kind") setKind(el.value);
        }}
        className="flex flex-col gap-6 pb-2"
      >
        {subjects.length > 1 ? (
          <ChoiceChips name="subject" legend={t("who")} options={subjects} defaultValue={subject} />
        ) : null}
        {/* 대상이 바뀌면 종류 목록이 바뀌므로 새로 그린다 */}
        <ChoiceChips
          key={type}
          name="kind"
          legend={t("what")}
          options={kindOptions}
          defaultValue={kind}
        />
        {info?.input === "measure" ? (
          <Field
            key={`${type}-${kind}`}
            name="value"
            label={t("value", { unit: info.unit ?? "" })}
            inputMode="decimal"
            autoComplete="off"
            error={error === "MILESTONE_VALUE_INVALID" ? errors(error) : undefined}
          />
        ) : null}
        {info?.input === "title" ? (
          <Field
            name="title"
            label={t("titleLabel")}
            maxLength={40}
            autoComplete="off"
            error={error === "BODY_REQUIRED" ? errors(error) : undefined}
          />
        ) : null}
        <Field name="date" type="date" label={t("date")} defaultValue={todayKey} max={todayKey} />
        <Field
          name="note"
          label={t("note")}
          hint={t("noteHint")}
          maxLength={500}
          autoComplete="off"
        />
        {error && error !== "MILESTONE_VALUE_INVALID" && error !== "BODY_REQUIRED" ? (
          <p aria-live="polite" className="font-bold">
            {errors(error)}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
