"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteEvent, saveEvent, type EventInput } from "@/app/s/[spaceId]/us/calendar/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import { timeZone } from "@/i18n/config";
import type { ErrorKey } from "@/lib/action-errors";
import { EVENT_POLICY } from "@/lib/plan";
import { dateOnlyKey, dayKey } from "@/lib/today-feed";
import { zonedInstant } from "@/lib/zone";

export type CalendarEvent = {
  id: string;
  title: string;
  kind: EventInput["kind"];
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  recurrence: "none" | "yearly";
  note: string | null;
  createdBy: { id: string; name: string | null };
};

const KINDS = ["gathering", "birthday", "anniversary", "other"] as const;

/** 일정이 놓이는 현지 날짜(종일은 저장된 날짜 그대로, 시각 있는 일정은 가족 시간대) */
const localDay = (e: Pick<CalendarEvent, "allDay" | "startsAt">) =>
  e.allDay ? dateOnlyKey(e.startsAt) : dayKey(e.startsAt, timeZone);

const timeOf = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

/**
 * 가족 달력(PRD §4.4): 한 달을 날짜별 목록으로 본다(작은 칸 달력보다 큰 글자로 읽기 쉽다). 일정을 누르면 자세히,
 * 쓰는 사람(parent, grandparent)은 [일정 더하기]. 고치기, 지우기는 적은 사람 또는 parent.
 */
export function CalendarView({
  spaceId,
  events,
  canWrite,
  myUserId,
  isParent,
  authors,
  todayKey,
}: {
  spaceId: string;
  events: CalendarEvent[];
  canWrite: boolean;
  myUserId: string;
  isParent: boolean;
  authors: Record<string, string>;
  todayKey: string;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const [sheet, setSheet] = useState<{
    mode: "view" | "edit" | "new";
    event: CalendarEvent | null;
    seq: number;
    open: boolean;
  }>({ mode: "new", event: null, seq: 0, open: false });
  const show = (mode: "view" | "edit" | "new", event: CalendarEvent | null) =>
    setSheet((s) => ({ mode, event, seq: s.seq + 1, open: true }));
  const close = () => setSheet((s) => ({ ...s, open: false }));

  const days = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = localDay(e);
    days.set(key, [...(days.get(key) ?? []), e]);
  }
  const dayTitle = (key: string) =>
    format.dateTime(new Date(`${key}T12:00:00Z`), {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      weekday: "short",
    });

  return (
    <>
      {canWrite ? (
        <Button variant="primary" block onClick={() => show("new", null)}>
          <Icon name="plus" size="small" />
          {t("add")}
        </Button>
      ) : null}
      {days.size ? (
        <ol className="flex flex-col gap-6">
          {[...days].map(([key, list]) => (
            <li key={key} className="flex flex-col gap-1">
              <h2 className="flex items-baseline gap-2 font-bold tabular-nums">
                {dayTitle(key)}
                {key === todayKey ? <span className="text-caption">{t("today")}</span> : null}
              </h2>
              <ul className="flex flex-col">
                {list.map((e) => (
                  <li key={`${e.id}-${e.startsAt.getTime()}`}>
                    <button
                      type="button"
                      data-press=""
                      onClick={() => show("view", e)}
                      className="press flex min-h-(--touch-elder) w-full items-center gap-3 border-b-(length:--bw-hair) border-line py-2 text-left"
                    >
                      <span className="w-16 flex-none text-caption text-fg-muted tabular-nums">
                        {e.allDay ? t("allDay") : timeOf(e.startsAt)}
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="font-bold">{e.title}</span>
                        <span className="text-caption text-fg-muted">
                          {t(`kind.${e.kind}`)}
                          {e.recurrence === "yearly" ? <>, {t("yearly")}</> : null}
                          {e.endsAt && localDay({ ...e, startsAt: e.endsAt }) !== key ? (
                            <>
                              ,{" "}
                              {t("until", {
                                date: dayTitle(localDay({ ...e, startsAt: e.endsAt })),
                              })}
                            </>
                          ) : null}
                        </span>
                      </span>
                      <Icon name="right" size="small" />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-6 text-fg-muted">{t("empty")}</p>
      )}
      {sheet.seq ? (
        sheet.mode === "view" && sheet.event ? (
          <EventDetail
            key={sheet.seq}
            open={sheet.open}
            onClose={close}
            event={sheet.event}
            spaceId={spaceId}
            canEdit={sheet.event.createdBy.id === myUserId || isParent}
            who={authors[sheet.event.createdBy.id] ?? sheet.event.createdBy.name ?? ""}
            onEdit={() => show("edit", sheet.event)}
            dayTitle={dayTitle}
          />
        ) : (
          <EventForm
            key={sheet.seq}
            open={sheet.open}
            onClose={close}
            event={sheet.mode === "edit" ? sheet.event : null}
            spaceId={spaceId}
            todayKey={todayKey}
          />
        )
      ) : null}
    </>
  );
}

function EventDetail({
  open,
  onClose,
  event,
  spaceId,
  canEdit,
  who,
  onEdit,
  dayTitle,
}: {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  spaceId: string;
  canEdit: boolean;
  who: string;
  onEdit: () => void;
  dayTitle: (key: string) => string;
}) {
  const t = useTranslations("calendar");
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      const result = await deleteEvent(spaceId, event.id);
      if ("error" in result && result.error !== "ITEM_NOT_FOUND") {
        toast({ message: errors(result.error) });
        return;
      }
      onClose();
      toast({ message: t("removed") });
      router.refresh();
    });
  const start_ = localDay(event);
  return (
    <Sheet open={open} onClose={onClose} title={t("sheetView")} size="auto">
      <div className="flex flex-col gap-2 pb-2">
        <p className="text-caption font-bold text-fg-muted">
          {t(`kind.${event.kind}`)}
          {event.recurrence === "yearly" ? <>, {t("yearly")}</> : null}
        </p>
        <h3 className="text-title font-heavy">{event.title}</h3>
        <p className="tabular-nums">
          {dayTitle(start_)}
          {event.allDay ? null : <> {timeOf(event.startsAt)}</>}
          {event.endsAt ? (
            <>
              {" "}
              ~ {dayTitle(localDay({ ...event, startsAt: event.endsAt }))}
              {event.allDay ? null : <> {timeOf(event.endsAt)}</>}
            </>
          ) : null}
        </p>
        {event.note ? <p className="whitespace-pre-line">{event.note}</p> : null}
        <p className="text-caption text-fg-muted">{t("by", { who })}</p>
        {canEdit ? (
          confirming ? (
            <div
              role="alert"
              className="mt-2 flex flex-col gap-3 rounded-md border-(length:--bw-sel) border-fg p-4"
            >
              <p className="font-bold">{t("removeConfirm")}</p>
              <div className="flex gap-2">
                <Button onClick={() => setConfirming(false)} disabled={pending}>
                  {t("confirmNo")}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={remove}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {t("confirmYes")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="-ml-2 flex flex-wrap gap-2">
              <Button variant="text" onClick={onEdit}>
                <Icon name="pen" size="small" />
                {t("edit")}
              </Button>
              <Button variant="text" onClick={() => setConfirming(true)}>
                {t("remove")}
              </Button>
            </div>
          )
        ) : null}
      </div>
    </Sheet>
  );
}

/** 일정 더하기, 고치기 시트: 무슨 일, 종류, 하루 종일(날짜) 또는 시각, 해마다, 메모 */
function EventForm({
  open,
  onClose,
  event,
  spaceId,
  todayKey,
}: {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  spaceId: string;
  todayKey: string;
}) {
  const t = useTranslations("calendar");
  const errors = useTranslations("errors");
  const router = useRouter();
  const { toast } = useToast();
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();
  const startDay = event ? localDay(event) : todayKey;
  const endDay = event?.endsAt ? localDay({ ...event, startsAt: event.endsAt }) : "";

  const submit = (form: FormData) => {
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const title = text("title");
    if (!title) {
      setError("BODY_REQUIRED");
      return;
    }
    const startDate = text("startDate") || todayKey;
    const endDate = text("endDate");
    const startTime = text("startTime") || "00:00";
    const endTime = text("endTime");
    // 시각 있는 일정: 화면이 보여주는 가족 시간대로 읽는다(기기 시간대가 달라도 적은 그대로 보이게)
    const when: EventInput["when"] = allDay
      ? { allDay: true, startDate, ...(endDate && { endDate }) }
      : {
          allDay: false,
          startsAt: zonedInstant(startDate, startTime, timeZone),
          ...(endTime && { endsAt: zonedInstant(endDate || startDate, endTime, timeZone) }),
        };
    setError(null);
    start(async () => {
      const result = await saveEvent(spaceId, event?.id ?? null, {
        title,
        kind: (text("kind") || "gathering") as EventInput["kind"],
        when,
        recurrence: form.get("yearly") ? "yearly" : "none",
        note: text("note"),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      toast({ message: t("saved") });
      onClose();
      router.refresh();
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? t("sheetEdit") : t("sheetNew")}
      footer={
        <Button
          type="submit"
          form="event-form"
          variant="primary"
          size="elder"
          block
          disabled={pending}
          aria-busy={pending}
        >
          {t("save")}
        </Button>
      }
    >
      <form
        id="event-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-6 pb-2"
      >
        <Field
          name="title"
          label={t("titleLabel")}
          maxLength={EVENT_POLICY.titleMaxChars}
          autoComplete="off"
          defaultValue={event?.title ?? ""}
          error={error === "BODY_REQUIRED" ? errors(error) : undefined}
        />
        <ChoiceChips
          name="kind"
          legend={t("kindLabel")}
          defaultValue={event?.kind ?? "gathering"}
          options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
        />
        <Switch name="allDay" label={t("allDayLabel")} checked={allDay} onChange={setAllDay} />
        <div className="flex flex-col gap-4">
          <Field name="startDate" type="date" label={t("startDate")} defaultValue={startDay} />
          {allDay ? null : (
            <Field
              name="startTime"
              type="time"
              label={t("startTime")}
              defaultValue={event && !event.allDay ? timeOf(event.startsAt) : "12:00"}
            />
          )}
          <Field
            name="endDate"
            type="date"
            label={t("endDate")}
            hint={t("endDateHint")}
            defaultValue={endDay}
          />
          {allDay ? null : (
            <Field
              name="endTime"
              type="time"
              label={t("endTime")}
              hint={t("optionalHint")}
              defaultValue={event?.endsAt && !event.allDay ? timeOf(event.endsAt) : ""}
            />
          )}
        </div>
        <Switch
          name="yearly"
          label={t("yearlyLabel")}
          hint={t("yearlyHint")}
          defaultChecked={event?.recurrence === "yearly"}
        />
        <TextArea
          name="note"
          label={t("note")}
          hint={t("optionalHint")}
          rows={3}
          maxLength={EVENT_POLICY.noteMaxChars}
          defaultValue={event?.note ?? ""}
        />
        {error && error !== "BODY_REQUIRED" ? (
          <p aria-live="polite" className="font-bold">
            {errors(error)}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/** 켜고 끄는 칸(체크박스): 굵은 테두리 + 체크 표시(색만으로 구분하지 않음) */
function Switch({
  name,
  label,
  hint,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <label className="relative flex items-start gap-3" data-press="">
      <input
        type="checkbox"
        name={name}
        value="1"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer absolute inset-0 z-10 size-full opacity-0"
      />
      <span
        aria-hidden="true"
        className="press mt-1 flex size-(--icon) flex-none items-center justify-center rounded-sm border-(length:--bw) border-line-strong text-transparent peer-checked:border-(length:--bw-sel) peer-checked:border-fg peer-checked:text-fg peer-focus-visible:outline peer-focus-visible:outline-(length:--bw-sel) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg"
      >
        <Icon name="check" size="small" />
      </span>
      <span className="flex flex-col">
        <span className="font-bold">{label}</span>
        {hint ? <span className="text-caption text-fg-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
