"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { askStory } from "@/app/s/[spaceId]/story/actions";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Sheet } from "@/components/ui/sheet";
import { TextArea } from "@/components/ui/text-area";
import { useToast } from "@/components/ui/toast";
import type { ErrorKey } from "@/lib/action-errors";
import { STORY_POLICY } from "@/lib/plan";
import {
  STORY_CATEGORIES,
  STORY_PROMPTS,
  type StoryCategory,
  type StoryPromptKey,
} from "@/lib/story-prompts";
import { useStory } from "./story-state";

const CUSTOM = "custom";

/**
 * 물어보기(parent → 어르신, PRD §4.3): 누구께 → 어떤 이야기(카테고리) → 질문 카드 하나 또는 직접 쓴 질문.
 * 같은 카드가 이미 답을 기다리면 서버가 그 물어보기를 돌려준다(새 알림 없음).
 */
export function AskSheet({
  open,
  onClose,
  toMemberId,
  promptKey,
}: {
  open: boolean;
  onClose: () => void;
  toMemberId: string;
  promptKey?: StoryPromptKey;
}) {
  const t = useTranslations("storyAsk");
  const tp = useTranslations("story");
  const errors = useTranslations("errors");
  const { toast } = useToast();
  const { spaceId, narrators, addAsk } = useStory();
  const elders = narrators.filter((n) => n.role === "grandparent" && !n.memorial);
  const [to, setTo] = useState(toMemberId);
  const [category, setCategory] = useState<StoryCategory>(
    promptKey ? STORY_PROMPTS[promptKey] : STORY_CATEGORIES[0],
  );
  const [picked, setPicked] = useState<string>(promptKey ?? CUSTOM);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [sending, setSending] = useState(false);
  const cards = (Object.keys(STORY_PROMPTS) as StoryPromptKey[]).filter(
    (k) => STORY_PROMPTS[k] === category,
  );

  const submit = async () => {
    const custom = picked === CUSTOM;
    const text = question.trim();
    if (custom && !text) {
      setError("QUESTION_REQUIRED");
      return;
    }
    setError(null);
    setSending(true);
    const result = await askStory(spaceId, {
      toMemberId: to,
      ...(custom ? { question: text } : { promptKey: picked }),
    });
    setSending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    addAsk(result);
    toast({
      message: t("done", { name: elders.find((e) => e.memberId === to)?.label ?? "" }),
    });
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
          form="story-ask-form"
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
        id="story-ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        onChange={(e) => {
          const el = e.target as unknown as HTMLInputElement;
          if (el.name === "to") setTo(el.value);
          if (el.name === "category") {
            setCategory(el.value as StoryCategory);
            setPicked(CUSTOM);
          }
          if (el.name === "prompt") setPicked(el.value);
        }}
        className="flex flex-col gap-6 pb-2"
      >
        {elders.length > 1 ? (
          <ChoiceChips
            name="to"
            legend={t("to")}
            defaultValue={to}
            options={elders.map((e) => ({ value: e.memberId, label: e.label }))}
          />
        ) : null}
        <ChoiceChips
          name="category"
          legend={t("category")}
          defaultValue={category}
          options={STORY_CATEGORIES.map((c) => ({ value: c, label: tp(`categories.${c}`) }))}
        />
        {/* 카테고리가 바뀌면 카드 목록이 바뀌므로 새로 그린다 */}
        <fieldset key={category} className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">{t("question")}</legend>
          {[...cards, CUSTOM].map((k) => (
            <label
              key={k}
              data-press=""
              className="press relative flex min-h-(--touch) items-center rounded-md border-(length:--bw) border-line-strong px-4 py-2 has-checked:border-(length:--bw-sel) has-checked:border-fg has-checked:font-bold has-focus-visible:outline has-focus-visible:outline-(length:--bw-sel) has-focus-visible:outline-offset-2 has-focus-visible:outline-fg"
            >
              <input
                type="radio"
                name="prompt"
                value={k}
                defaultChecked={k === picked}
                className="absolute inset-0 opacity-0"
              />
              {k === CUSTOM ? t("custom") : tp(`prompts.${k}` as Parameters<typeof tp>[0])}
            </label>
          ))}
        </fieldset>
        {picked === CUSTOM ? (
          <TextArea
            label={t("customLabel")}
            hint={t("customHint")}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={STORY_POLICY.questionMaxChars}
            error={error === "QUESTION_REQUIRED" ? errors(error) : undefined}
          />
        ) : null}
        {error && error !== "QUESTION_REQUIRED" ? (
          <p aria-live="polite" className="font-bold">
            {errors(error)}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
