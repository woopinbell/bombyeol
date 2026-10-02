"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, prefersReducedMotion } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const SWIPE = motion["toast-swipe"];

export type DismissReason = "timeout" | "close" | "action" | "replaced";

export type ToastInput = {
  message: string;
  /** 되돌리기 같은 한 가지 행동(누르면 토스트가 닫힌다) */
  action?: { label: string; onAction: () => void };
  /** 어떤 이유로든 사라질 때(되돌리기를 안 눌렀으면 실제 삭제 같은 마무리) */
  onDismiss?: (reason: DismissReason) => void;
};

type Item = ToastInput & { id: number };

type ToastApi = {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

type ToastState = ToastApi & {
  items: Item[];
  remove: (id: number, reason: DismissReason) => void;
  /** 열린 시트 수: 시트가 열려 있으면 토스트는 시트 안에 뜬다(뒤 화면은 비활성) */
  sheets: number;
  setSheets: (update: (n: number) => number) => void;
};

const ToastContext = createContext<ToastState | null>(null);

/**
 * 토스트(DESIGN §9.6, §11, Sonner 방식): 하단에 최대 3개, 6초, 손을 올리거나 탭이 숨으면 멈춤,
 * [닫기] 버튼 동반, 아래로 밀어 닫기(45px 또는 0.11px/ms), aria-live polite.
 * 중요한 결과는 토스트에만 두지 않는다(화면에도 남긴다).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sheets, setSheets] = useState(0);
  const nextId = useRef(1);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const remove = useCallback((id: number, reason: DismissReason) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    itemsRef.current = itemsRef.current.filter((i) => i.id !== id);
    setItems((list) => list.filter((i) => i.id !== id));
    item.onDismiss?.(reason);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const overflow = itemsRef.current.length + 1 - SWIPE.max;
      if (overflow > 0) {
        for (const old of itemsRef.current.slice(0, overflow)) remove(old.id, "replaced");
      }
      const item = { ...input, id };
      itemsRef.current = [...itemsRef.current, item];
      setItems((list) => [...list, item]);
      return id;
    },
    [remove],
  );

  const value = useMemo(
    () => ({
      items,
      toast,
      dismiss: (id: number) => remove(id, "close"),
      remove,
      sheets,
      setSheets,
    }),
    [items, toast, remove, sheets],
  );
  return <ToastContext value={value}>{children}</ToastContext>;
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider is missing");
  return ctx;
}

/** 시트가 열려 있는 동안 토스트를 시트 안으로 옮긴다 */
export function useSheetToastHost(open: boolean) {
  const ctx = useContext(ToastContext);
  const setSheets = ctx?.setSheets;
  useEffect(() => {
    if (!open || !setSheets) return;
    setSheets((n) => n + 1);
    return () => setSheets((n) => n - 1);
  }, [open, setSheets]);
}

/** 토스트가 뜨는 자리. page = 하단 탭(과 dock) 위, sheet = 시트 아래 입력 영역 위 */
export function ToastRegion({ host }: { host: "page" | "sheet" }) {
  const ctx = useContext(ToastContext);
  const t = useTranslations("ui");
  if (!ctx) return null;
  const active = host === "sheet" ? ctx.sheets > 0 : ctx.sheets === 0;
  return (
    <div
      aria-live="polite"
      aria-label={t("notifications")}
      role="region"
      className={cn(
        "pointer-events-none flex flex-col gap-2",
        host === "page" ? "toast-region-page" : "absolute inset-x-0 bottom-full pb-3",
      )}
    >
      {active
        ? ctx.items.map((item) => (
            <ToastView key={item.id} item={item} onDone={(r) => ctx.remove(item.id, r)} />
          ))
        : null}
    </div>
  );
}

function ToastView({ item, onDone }: { item: Item; onDone: (reason: DismissReason) => void }) {
  const t = useTranslations("ui");
  const el = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const leaving = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const leave = useCallback((reason: DismissReason) => {
    if (leaving.current) return;
    leaving.current = true;
    setShown(false);
    const wait = prefersReducedMotion() ? motion["d-fast"] : motion["d-toast"];
    setTimeout(() => onDoneRef.current(reason), wait);
  }, []);

  // 수명: 6초. 손을 올리거나(포인터) 탭이 숨으면 멈췄다가 남은 시간만큼 이어 간다
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    let remaining = motion["toast-life"];
    let started = performance.now();
    let timer = setTimeout(() => leave("timeout"), remaining);
    const pause = () => {
      clearTimeout(timer);
      remaining -= performance.now() - started;
    };
    const resume = () => {
      started = performance.now();
      clearTimeout(timer);
      timer = setTimeout(() => leave("timeout"), Math.max(0, remaining));
    };
    const node = el.current;
    const onVisibility = () => (document.hidden ? pause() : resume());
    node?.addEventListener("pointerenter", pause);
    node?.addEventListener("pointerleave", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      node?.removeEventListener("pointerenter", pause);
      node?.removeEventListener("pointerleave", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [leave]);

  // 아래로 밀어 닫기
  const swipe = useRef<{ y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    swipe.current = { y: e.clientY, t: performance.now() };
    el.current?.setPointerCapture(e.pointerId);
    el.current?.setAttribute("data-swiping", "");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipe.current || !el.current || prefersReducedMotion()) return;
    el.current.style.transform = `translateY(${Math.max(0, e.clientY - swipe.current.y)}px)`;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || !el.current) return;
    swipe.current = null;
    el.current.removeAttribute("data-swiping");
    el.current.style.transform = "";
    const dy = e.clientY - s.y;
    if (dy > SWIPE.distance || dy / Math.max(1, performance.now() - s.t) > SWIPE.velocity) {
      leave("close");
    }
  };

  return (
    <div
      ref={el}
      data-state={shown ? "open" : "closed"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="toast pointer-events-auto flex items-center gap-1 rounded-md bg-strong py-1 pr-1 pl-4 font-medium text-on-strong"
      style={{ touchAction: "none" }}
    >
      <p className="flex-1 py-2">{item.message}</p>
      {item.action ? (
        <button
          type="button"
          data-press=""
          onClick={() => {
            item.action?.onAction();
            leave("action");
          }}
          className="press min-h-(--touch) px-3 font-bold underline underline-offset-4"
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        data-press=""
        onClick={() => leave("close")}
        className="press min-h-(--touch) px-3 font-medium"
      >
        {t("close")}
      </button>
    </div>
  );
}
