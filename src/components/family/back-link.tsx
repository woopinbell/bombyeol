import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** 탭 안의 하위 화면 머리말: 돌아갈 곳을 글자로 보여주는 링크(아이콘만 두지 않는다, DESIGN §9.1-3) */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-press=""
      className="press -ml-2 inline-flex min-h-(--touch) items-center gap-1 rounded-md px-2 font-bold"
    >
      <Icon name="left" size="small" />
      {children}
    </Link>
  );
}
