import type { ReactNode } from "react";

/** 탭을 옮길 때마다 새로 그려진다: 이동 없이 200ms 페이드(자주 쓰는 동작이라 최소 모션, DESIGN §11) */
export default function TabTemplate({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col animate-tab-in">{children}</div>;
}
