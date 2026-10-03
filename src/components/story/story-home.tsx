"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { cancelAsk, loadMoreStories } from "@/app/s/[spaceId]/story/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { dailyPrompt, type StoryAsk, type StoryItem } from "@/lib/story-view";
import type { StoryPromptKey } from "@/lib/story-prompts";
import { motion, prefersReducedMotion } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { AskSheet } from "./ask-sheet";
import { StarButton, useStar } from "./star";
import { StorySheet, useStoryQuestion } from "./story-sheet";
import { useStory } from "./story-state";
import { WriteSheet, type WriteTarget } from "./write-sheet";

/**
 * 맨 위 질문 카드(DESIGN §9.3): 어르신께 온 물어보기가 있으면 그것, 없으면 오늘의 질문.
 * answer = 내 이야기로 답하기, elder = 부모가 어르신께 물어보거나 대신 받아 적기.
 */
export type QuestionCard =
  | { kind: "ask"; ask: StoryAsk }
  | { kind: "prompt"; mode: "answer"; narratorId: string; answered: string[] }
  | { kind: "prompt"; mode: "elder"; narratorId: string; answered: string[] };

type Open =
  | { sheet: "write"; target: WriteTarget }
  | { sheet: "ask"; toMemberId: string; promptKey?: StoryPromptKey }
  | null;

/** 이야기(별) 탭 본문: 질문 카드, 답을 기다리는 질문, 이야기 모음 */
export function StoryHome({ card: serverCard }: { card: QuestionCard | null }) {
  const t = useTranslations("storyTab");
  const tp = useTranslations("story");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const state = useStory();
  const { me, narrators, todayKey } = state;
  // 답한(또는 거둔) 물어보기 카드는 서버가 새 카드를 줄 때까지 바로 감춘다
  const card =
    serverCard?.kind === "ask" &&
    (!state.asks.some((a) => a.id === serverCard.ask.id) || state.hidden.has(serverCard.ask.id))
      ? null
      : serverCard;
  const [open, setOpen] = useState<Open>(null);
  const [shown, setShown] = useState(false);
  // 시트마다 열 때 seq를 올려 안의 상태를 새로 시작한다(닫히는 동안에는 같은 시트가 남아 내려간다)
  const [seq, setSeq] = useState(0);
  const show = (next: Exclude<Open, null>) => {
    setSeq((s) => s + 1);
    setOpen(next);
    setShown(true);
  };
  const close = () => setShown(false);
  const [offset, setOffset] = useState(0);
  const [loading, startLoading] = useTransition();

  const label = (memberId: string) => narrators.find((n) => n.memberId === memberId)?.label ?? "";
  const promptKey =
    card?.kind === "prompt" ? dailyPrompt(new Set(card.answered), todayKey, offset) : null;
  const askQuestion = (ask: StoryAsk) =>
    ask.promptKey
      ? tp(`prompts.${ask.promptKey}` as Parameters<typeof tp>[0])
      : (ask.question ?? "");
  const canWrite = me.role !== "relative" && !me.memorial;
  // 직접 쓰기의 기본 화자: 지금 고른 분(받아 적을 수 있으면), 아니면 나
  const freeNarrator =
    state.narratorId &&
    narrators.some(
      (n) => n.memberId === state.narratorId && n.role === "grandparent" && !n.memorial,
    )
      ? state.narratorId
      : me.memberId;

  const asks = state.asks.filter(
    (a) =>
      !state.hidden.has(a.id) &&
      (!state.narratorId || a.to.memberId === state.narratorId) &&
      !(card?.kind === "ask" && card.ask.id === a.id),
  );
  const items = state.items.filter((s) => !state.hidden.has(s.id));

  const withdraw = (ask: StoryAsk) => {
    state.setHidden(ask.id, true);
    toast({
      message: t("askCanceled"),
      action: { label: t("undo"), onAction: () => state.setHidden(ask.id, false) },
      onDismiss: async (reason) => {
        if (reason === "action") return;
        const result = await cancelAsk(state.spaceId, ask.id);
        if ("error" in result && result.error !== "ITEM_NOT_FOUND") {
          state.setHidden(ask.id, false);
          toast({ message: errors(result.error) });
        } else {
          state.dropAsk(ask.id);
        }
      },
    });
  };

  const more = () =>
    startLoading(async () => {
      if (!state.cursor) return;
      const result = await loadMoreStories(state.spaceId, state.narratorId, state.cursor);
      if ("error" in result) {
        toast({ message: errors(result.error) });
        return;
      }
      const seen = new Set(state.items.map((s) => s.id));
      state.setPage(
        [...state.items, ...result.items.filter((s) => !seen.has(s.id))],
        result.nextCursor,
      );
    });

  return (
    <>
      {card ? (
        <section
          aria-labelledby="question-card"
          className="mt-4 flex flex-col gap-4 rounded-lg bg-surface p-5"
        >
          <p className="inline-flex items-center gap-2 text-caption font-bold text-starlight-gold">
            <Icon name="spark" size="small" />
            {card.kind === "ask"
              ? t("askedBy", {
                  who: state.authors[card.ask.askedBy.id] ?? card.ask.askedBy.name ?? "",
                })
              : card.mode === "elder"
                ? `${t("todayQuestion")}, ${label(card.narratorId)}`
                : t("todayQuestion")}
          </p>
          <h2 id="question-card" className="text-title font-heavy text-balance">
            {card.kind === "ask"
              ? askQuestion(card.ask)
              : tp(`prompts.${promptKey}` as Parameters<typeof tp>[0])}
          </h2>
          {card.kind === "ask" ? (
            <Button
              variant="primary"
              size="elder"
              block
              onClick={() =>
                show({
                  sheet: "write",
                  target: {
                    kind: "ask",
                    askId: card.ask.id,
                    question: askQuestion(card.ask),
                    narratorId: card.ask.to.memberId,
                  },
                })
              }
            >
              <Icon name="pen" size="small" />
              {t("answer")}
            </Button>
          ) : card.mode === "answer" ? (
            <Button
              variant="primary"
              size="elder"
              block
              onClick={() =>
                show({
                  sheet: "write",
                  target: { kind: "prompt", promptKey: promptKey!, narratorId: card.narratorId },
                })
              }
            >
              <Icon name="pen" size="small" />
              {t("answer")}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="elder"
              block
              onClick={() =>
                show({ sheet: "ask", toMemberId: card.narratorId, promptKey: promptKey! })
              }
            >
              {t("askTo", { name: label(card.narratorId) })}
            </Button>
          )}
          {card.kind === "prompt" ? (
            <div className="-mt-2 -ml-2 flex flex-wrap gap-2">
              <Button variant="text" onClick={() => setOffset((o) => o + 1)}>
                {t("otherQuestion")}
              </Button>
              {card.mode === "elder" ? (
                <Button
                  variant="text"
                  onClick={() =>
                    show({
                      sheet: "write",
                      target: {
                        kind: "prompt",
                        promptKey: promptKey!,
                        narratorId: card.narratorId,
                      },
                    })
                  }
                >
                  <Icon name="pen" size="small" />
                  {t("scribe")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {asks.length ? (
        <section aria-labelledby="waiting-heading" className="mt-8 flex flex-col gap-3">
          <h2 id="waiting-heading" className="font-bold">
            {t("waitingTitle")}
          </h2>
          <ul className="flex flex-col">
            {asks.map((ask) => {
              const mine = ask.to.memberId === me.memberId;
              const scribing = !mine && me.role !== "relative";
              const sender = ask.askedBy.id === me.userId || me.role === "parent";
              const target: WriteTarget = {
                kind: "ask",
                askId: ask.id,
                question: askQuestion(ask),
                narratorId: ask.to.memberId,
              };
              return (
                <li
                  key={ask.id}
                  className="flex flex-col gap-1 border-b-(length:--bw-hair) border-line py-3"
                >
                  <p className="font-bold">{askQuestion(ask)}</p>
                  <p className="text-caption text-fg-muted">
                    {t("waitingTo", { to: ask.to.label ?? ask.to.name ?? "" })}
                  </p>
                  <div className="-ml-2 flex flex-wrap gap-2">
                    {mine || scribing ? (
                      <Button variant="text" onClick={() => show({ sheet: "write", target })}>
                        <Icon name="pen" size="small" />
                        {mine ? t("answer") : t("scribe")}
                      </Button>
                    ) : null}
                    {sender ? (
                      <Button variant="text" onClick={() => withdraw(ask)}>
                        {t("cancelAsk")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="collection-heading" className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 id="collection-heading" className="font-bold">
              {t("collection")}
            </h2>
            {state.summary.stories ? (
              <p className="text-caption text-fg-muted tabular-nums">
                {t("summary", state.summary)}
              </p>
            ) : null}
          </div>
          {canWrite ? (
            <Button
              onClick={() =>
                show({ sheet: "write", target: { kind: "free", narratorId: freeNarrator } })
              }
            >
              <Icon name="pen" size="small" />
              {t("write")}
            </Button>
          ) : null}
        </div>
        {items.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {items.map((story) => (
              <li key={story.id} className="flex">
                <StoryTile story={story} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2 py-6">
            <p className="text-title-s font-bold">{t("emptyTitle")}</p>
            <p className="text-fg-muted">{t("emptyLead")}</p>
          </div>
        )}
        {state.cursor ? (
          <Button className="mt-4" block onClick={more} disabled={loading} aria-busy={loading}>
            {loading ? t("loading") : t("more")}
          </Button>
        ) : null}
      </section>

      {seq && open?.sheet === "write" ? (
        <WriteSheet key={seq} open={shown} onClose={close} target={open.target} />
      ) : null}
      {seq && open?.sheet === "ask" ? (
        <AskSheet
          key={seq}
          open={shown}
          onClose={close}
          toMemberId={open.toMemberId}
          promptKey={open.promptKey}
        />
      ) : null}
    </>
  );
}

/**
 * 이야기 모음의 한 칸: 사진(있으면), 제목(없으면 질문, 그것도 없으면 첫 줄), 누구 이야기, 별 하나, 댓글 수.
 * 칸을 누르면 자세히 보기, 고치기는 거기서 쓰기 시트로 넘어간다.
 */
function StoryTile({ story }: { story: StoryItem }) {
  const t = useTranslations("storyTab");
  const { spaceId, fresh, bumpStars } = useStory();
  const question = useStoryQuestion(story);
  const { star: live, toggle } = useStar(spaceId, story.id, {
    on: story.reactions.starredByMe,
    count: story.reactions.stars,
  });
  // 별 수가 바뀐 만큼 모음 합계에 더한다(누른 즉시, 실패해 되돌아오면 다시 뺀다)
  const counted = useRef(live.count);
  useEffect(() => {
    const change = live.count - counted.current;
    counted.current = live.count;
    if (change) bumpStars(change);
  }, [live.count, bumpStars]);
  const [comments, setComments] = useState(story.reactions.comments);
  const [sheet, setSheet] = useState<{ open: boolean; seq: number; editing: boolean }>({
    open: false,
    seq: 0,
    editing: false,
  });
  const heading = story.title ?? question ?? story.body.split("\n")[0];
  return (
    <article
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg bg-surface",
        fresh.has(story.id) && "comment-in",
      )}
    >
      <button
        type="button"
        data-press=""
        onClick={() => setSheet((s) => ({ open: true, seq: s.seq + 1, editing: false }))}
        className="press flex flex-1 flex-col text-left"
      >
        {story.photo ? (
          // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover"
          />
        ) : null}
        <span className="flex flex-col gap-1 px-4 pt-3">
          <span className="line-clamp-3 font-bold">{heading}</span>
          <span className="text-caption text-fg-muted">
            {story.narrator.memorial ? (
              <span className="mr-1 inline-flex items-center gap-1 rounded-sm border-(length:--bw) border-dashed border-line-strong px-1">
                <Icon name="star" size="small" />
                {t("memorialMark")}
              </span>
            ) : null}
            {t("byline", { name: story.narrator.label ?? story.narrator.name ?? "" })}
            {story.storyYear ? <>, {t("year", { year: story.storyYear })}</> : null}
          </span>
        </span>
      </button>
      <div className="mt-auto flex flex-wrap items-center gap-2 px-4 pt-2 pb-4">
        <StarButton star={live} onToggle={toggle} size="small" />
        {comments ? (
          <span className="inline-flex items-center gap-1 text-caption text-fg-muted tabular-nums">
            <Icon name="talk" size="small" />
            {t("comment", { count: comments })}
          </span>
        ) : null}
      </div>
      {sheet.seq ? (
        sheet.editing ? (
          <WriteSheet
            key={`edit-${sheet.seq}`}
            open={sheet.open}
            onClose={() => setSheet((s) => ({ ...s, open: false }))}
            target={{ kind: "edit", story }}
          />
        ) : (
          <StorySheet
            key={sheet.seq}
            open={sheet.open}
            onClose={() => setSheet((s) => ({ ...s, open: false }))}
            story={story}
            star={live}
            onToggleStar={toggle}
            onCommentsChange={setComments}
            onEdit={() => {
              setSheet((s) => ({ ...s, open: false }));
              // 자세히 보기가 내려간 뒤 고치기를 연다
              setTimeout(
                () => setSheet((s) => ({ open: true, seq: s.seq + 1, editing: true })),
                prefersReducedMotion() ? motion["d-fast"] : motion["d-sheet"],
              );
            }}
          />
        )
      ) : null}
    </article>
  );
}
