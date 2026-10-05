"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, prefersReducedMotion } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ToastRegion, useSheetToastHost } from "./toast";

const DRAG = motion["sheet-drag"];

/**
 * 아래에서 올라오는 시트(DESIGN §9.6, §11). 네이티브 <dialog>(모달)라 포커스 가두기, Esc, 뒤 화면 비활성이 기본이다.
 * - 늘 보이는 [닫기] 버튼, 끌어 닫기는 보조(높이 25% 또는 0.4px/ms, 목록 스크롤 직후 100ms 잠금, 위로는 로그 감쇠)
 * - 열기, 닫기 모두 ease-sheet 350ms(ease-in 없음), 감소 모션이면 200ms 페이드만
 * - 시트가 열려 있는 동안 토스트는 시트 안 영역에 뜬다(뒤 화면은 비활성이라)
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = "full",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** 시트 아래에 붙는 영역(입력창, 주 버튼) */
  footer?: ReactNode;
  size?: "full" | "auto";
}) {
  const t = useTranslations("ui");
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const lastScroll = useRef(0);

  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);
  useSheetToastHost(open && mounted);

  // 열기: showModal 다음 프레임에 올린다(전환이 시작점을 보도록)
  useEffect(() => {
    const el = dialog.current;
    if (!open || !mounted || !el) return;
    if (!el.open) el.showModal();
    document.documentElement.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [open, mounted]);

  // 닫기: 내려가는 전환이 끝난 뒤 dialog를 닫고 내린다
  useEffect(() => {
    if (open || !mounted) return;
    const wait = prefersReducedMotion() ? motion["d-fast"] : motion["d-sheet"];
    const timer = setTimeout(() => {
      dialog.current?.close();
      document.documentElement.style.overflow = "";
      setMounted(false);
    }, wait);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  // 끌어 닫기
  const drag = useRef<{ y: number; t: number; dy: number; h: number } | null>(null);
  const setDragStyle = (offset: number | null, scrimOpacity: number | null) => {
    if (panel.current)
      panel.current.style.transform = offset === null ? "" : `translateY(${offset}px)`;
    if (scrim.current)
      scrim.current.style.opacity = scrimOpacity === null ? "" : String(scrimOpacity);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, label, video")) return;
    const list = body.current;
    if (
      list?.contains(target) &&
      (list.scrollTop > 0 || performance.now() - lastScroll.current < DRAG["scroll-lock"])
    ) {
      return;
    }
    const h = panel.current?.getBoundingClientRect().height ?? 1;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, h };
    panel.current?.setPointerCapture(e.pointerId);
    dialog.current?.setAttribute("data-dragging", "");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.dy = e.clientY - d.y;
    const offset = d.dy >= 0 ? d.dy : -8 * Math.log(1 - d.dy);
    setDragStyle(prefersReducedMotion() ? null : offset, Math.max(0, 1 - Math.max(0, d.dy) / d.h));
  };
  const onPointerEnd = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    dialog.current?.removeAttribute("data-dragging");
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    const close = d.dy > d.h * DRAG["close-ratio"] || (d.dy > 0 && velocity > DRAG.velocity);
    if (close) {
      // 놓은 자리에서 그대로 내려간다(위로 되돌아갔다 내려가는 깜빡임 없이)
      setDragStyle(prefersReducedMotion() ? null : d.h, 0);
      onClose();
    } else {
      setDragStyle(null, null);
    }
  };

  if (!mounted) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      data-state={shown ? "open" : "closed"}
      className="sheet fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 text-fg backdrop:bg-transparent"
    >
      <div
        ref={scrim}
        aria-hidden="true"
        onClick={onClose}
        className="sheet-scrim absolute inset-0 bg-scrim"
      />
      <div
        ref={panel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(
          "sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-w-(--content-max) flex-col rounded-t-lg bg-bg",
          "overscroll-contain px-5 pt-2 pb-[max(var(--sp-5),env(safe-area-inset-bottom))]",
          size === "full" ? "top-12" : "max-h-[calc(100dvh-var(--sp-8))]",
        )}
        style={{ touchAction: "none" }}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-1 w-8 flex-none rounded-full bg-line-strong"
        />
        <div className="mb-3 flex flex-none items-center justify-between gap-3">
          <h2 id="sheet-title" className="text-title-s font-bold">
            {title}
          </h2>
          <Button variant="text" className="flex-none" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
        <div
          ref={body}
          onScroll={() => (lastScroll.current = performance.now())}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ touchAction: "pan-y" }}
        >
          {children}
        </div>
        <div className="relative flex-none">
          <ToastRegion host="sheet" />
        </div>
        {footer ? <div className="flex-none pt-3">{footer}</div> : null}
      </div>
    </dialog>
  );
}
