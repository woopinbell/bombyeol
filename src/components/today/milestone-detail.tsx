"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { updateMilestone } from "@/app/s/[spaceId]/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { kindInfo } from "@/lib/milestone-kinds";
import { dateOnlyKey, type FeedMilestone } from "@/lib/today-feed";
import {
  CommentForm,
  CommentList,
  LikeButton,
  useComments,
  useLike,
  type CommentsChange,
  type LikeState,
} from "./reactions";
import { useToday } from "./today-state";
import { FirstSwitch, readMilestoneValue } from "./write-sheets";

/** 성장 기록 한 줄(대상 이름 + 순간). 띠와 자세히 보기 시트가 함께 쓴다 */
export function MilestoneSentence({ milestone }: { milestone: FeedMilestone }) {
  const t = useTranslations("milestone");
  const subject = milestone.childId ? "child" : "pet";
  const value = (milestone.value ?? {}) as { value?: number; title?: string };
  // 프리셋 키(src/lib/milestones.ts)는 서버가 검증한 값이라 문구 키로 그대로 쓴다
  const kind = `${subject}.${milestone.kind}` as Parameters<typeof t>[0];
  return (
    <>
      <b className="font-bold">{milestone.subjectName}</b>{" "}
      {t.has(kind)
        ? t(kind, {
            value: value.value ?? "",
            title: value.title ?? "",
            first: String(milestone.isFirst),
          })
        : null}
    </>
  );
}

/**
 * 성장 기록 자세히 보기 시트: 한 줄, 날짜, 남긴 사람, 메모, 좋아요, 댓글. 지우기는 남긴 사람 또는 parent
 * (바로 사라지고 6초 동안 되돌리기, DESIGN §9.1-7).
 */
export function MilestoneDetail({
  open,
  onClose,
  milestone,
  spaceId,
  authors,
  myUserId,
  canModerate,
  like: initialLike,
  onLikeChange,
  onCommentsChange,
  onDelete,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  milestone: FeedMilestone;
  spaceId: string;
  authors: Record<string, string>;
  myUserId: string;
  canModerate: boolean;
  like: LikeState;
  onLikeChange: (like: LikeState) => void;
  onCommentsChange: (change: CommentsChange) => void;
  onDelete?: () => void;
  /** 남긴 사람 또는 parent */
  canEdit: boolean;
}) {
  const t = useTranslations("milestoneDetail");
  const left = useTranslations("privacy")("leftFamily");
  const format = useFormatter();
  const target = { type: "milestone", milestoneId: milestone.id } as const;
  const { like, toggle } = useLike(spaceId, target, initialLike, onLikeChange);
  const comments = useComments({
    spaceId,
    target,
    open,
    focus: false,
    onChange: onCommentsChange,
  });
  const note = (milestone.value as { note?: string } | null)?.note;
  const who = authors[milestone.createdBy.id] ?? milestone.createdBy.name ?? left;
  const [editing, setEditing] = useState(false);
  const formId = useId();

  if (editing) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={t("title")}
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setEditing(false)}>{t("cancelEdit")}</Button>
            <Button type="submit" form={formId} variant="primary" className="flex-1">
              {t("save")}
            </Button>
          </div>
        }
      >
        <MilestoneEditForm
          id={formId}
          milestone={milestone}
          spaceId={spaceId}
          onDone={() => setEditing(false)}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={<CommentForm comments={comments} />}
    >
      <p className="text-title font-heavy">
        <MilestoneSentence milestone={milestone} />
      </p>
      <p className="mt-1 text-caption text-fg-muted">
        {t("byline", {
          who,
          // 기록일은 날짜만 의미가 있다(UTC 자정으로 저장)
          when: format.dateTime(milestone.recordedAt, {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })}
      </p>
      {note ? <p className="mt-3 whitespace-pre-line">{note}</p> : null}
      <div className="mt-4 flex gap-2">
        <LikeButton like={like} onClick={toggle} />
      </div>
      {canEdit || onDelete ? (
        <div className="mt-2 -ml-2 flex flex-wrap gap-2">
          {canEdit ? (
            <Button variant="text" onClick={() => setEditing(true)}>
              <Icon name="pen" size="small" />
              {t("edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="text" onClick={onDelete}>
              {t("remove")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <CommentList
        comments={comments}
        authors={authors}
        myUserId={myUserId}
        canModerate={canModerate}
      />
    </Sheet>
  );
}

/**
 * 성장 기록 고치기: 값(숫자, 제목), 날짜, 메모, "처음" 표시. 종류와 대상은 바꾸지 않는다(서버도 막는다).
 * 같은 순간에 이미 "처음"이 있으면 바로 덮지 않고 옮길지 묻는다(옮기기는 한 번에, 서버 moveFirst).
 */
function MilestoneEditForm({
  id,
  milestone,
  spaceId,
  onDone,
}: {
  id: string;
  milestone: FeedMilestone;
  spaceId: string;
  onDone: () => void;
}) {
  const t = useTranslations("milestoneSheet");
  const td = useTranslations("milestoneDetail");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const { todayKey, patchMilestone } = useToday();
  const info = kindInfo(milestone.childId ? "child" : "pet", milestone.kind);
  const value = (milestone.value ?? {}) as { value?: number; title?: string; note?: string };
  const [error, setError] = useState<ErrorKey | null>(null);
  // 옮기기를 물어볼 때 보낼 내용(한 번 더 누르면 moveFirst로 보낸다)
  const [pending, setPending] = useState<Parameters<typeof updateMilestone>[1] | null>(null);
  const [sending, setSending] = useState(false);

  const send = async (input: Parameters<typeof updateMilestone>[1]) => {
    setSending(true);
    const result = await updateMilestone(spaceId, input);
    setSending(false);
    if ("error" in result) {
      if (result.error === "MILESTONE_FIRST_EXISTS" && !input.moveFirst) {
        setPending({ ...input, moveFirst: true });
        return;
      }
      setPending(null);
      setError(result.error);
      return;
    }
    const { movedFromId, ...updated } = result;
    patchMilestone(milestone.id, {
      value: updated.value,
      recordedAt: updated.recordedAt,
      isFirst: updated.isFirst,
    });
    if (movedFromId) patchMilestone(movedFromId, { isFirst: false });
    toast({ message: movedFromId ? td("moved") : td("edited") });
    onDone();
  };

  const submit = (form: FormData) => {
    if (!info) return;
    setError(null);
    setPending(null);
    const read = readMilestoneValue(info, form);
    if ("error" in read) {
      setError(read.error);
      return;
    }
    void send({
      milestoneId: milestone.id,
      value: read.value,
      recordedAt: String(form.get("date") || dateOnlyKey(milestone.recordedAt)),
      first: info.firstable ? Boolean(form.get("first")) : undefined,
    });
  };

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }}
      aria-busy={sending}
      className="flex flex-col gap-6 pb-2"
    >
      <p className="text-title-s font-bold">
        <MilestoneSentence milestone={milestone} />
      </p>
      {info?.input === "measure" ? (
        <Field
          name="value"
          label={t("value", { unit: info.unit ?? "" })}
          inputMode="decimal"
          autoComplete="off"
          defaultValue={value.value}
          error={error === "MILESTONE_VALUE_INVALID" ? errors(error) : undefined}
        />
      ) : null}
      {info?.input === "title" ? (
        <Field
          name="title"
          label={t("titleLabel")}
          maxLength={40}
          autoComplete="off"
          defaultValue={value.title}
          error={error === "BODY_REQUIRED" ? errors(error) : undefined}
        />
      ) : null}
      {info?.firstable ? (
        <FirstSwitch label={t("first")} hint={t("firstHint")} defaultChecked={milestone.isFirst} />
      ) : null}
      {pending ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="font-bold">{td("firstTaken")}</p>
          <Button onClick={() => void send(pending)} disabled={sending} aria-busy={sending}>
            {td("moveFirst")}
          </Button>
        </div>
      ) : null}
      <Field
        name="date"
        type="date"
        label={t("date")}
        defaultValue={dateOnlyKey(milestone.recordedAt)}
        max={todayKey}
      />
      <Field
        name="note"
        label={t("note")}
        hint={t("noteHint")}
        maxLength={500}
        autoComplete="off"
        defaultValue={value.note}
      />
      {error && error !== "MILESTONE_VALUE_INVALID" && error !== "BODY_REQUIRED" ? (
        <p aria-live="polite" className="font-bold">
          {errors(error)}
        </p>
      ) : null}
    </form>
  );
}
