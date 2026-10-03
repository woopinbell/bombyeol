"use server";

import { toErrorKey, type ErrorKey } from "@/lib/action-errors";
import { serverCaller } from "@/server/trpc/server-caller";

type Done = { ok: true } | { error: ErrorKey };

export type EventInput = {
  title: string;
  kind: "gathering" | "birthday" | "anniversary" | "other";
  when:
    | { allDay: true; startDate: string; endDate?: string }
    | { allDay: false; startsAt: Date; endsAt?: Date };
  recurrence: "none" | "yearly";
  note: string;
};

/**
 * 일정 더하기, 고치기. 쓰기는 parent, grandparent, 고치기는 만든 사람 또는 parent(프로시저가 검사).
 * 종일 일정은 날짜로, 시각 있는 일정은 화면이 가족 시간대의 시각을 순간으로 바꿔 보낸다.
 */
export async function saveEvent(
  spaceId: string,
  eventId: string | null,
  input: EventInput,
): Promise<Done> {
  try {
    const caller = await serverCaller();
    const note = input.note.trim();
    if (eventId) {
      await caller.calendar.update({
        spaceId,
        eventId,
        title: input.title,
        kind: input.kind,
        when: input.when,
        recurrence: input.recurrence,
        note: note || null,
      });
    } else {
      await caller.calendar.create({
        spaceId,
        title: input.title,
        kind: input.kind,
        when: input.when,
        recurrence: input.recurrence,
        note: note || undefined,
      });
    }
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}

export async function deleteEvent(spaceId: string, eventId: string): Promise<Done> {
  try {
    const caller = await serverCaller();
    await caller.calendar.delete({ spaceId, eventId });
    return { ok: true };
  } catch (error) {
    return { error: toErrorKey(error) };
  }
}
