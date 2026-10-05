import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type ProfileRow = {
  key: string;
  name: string;
  detail?: ReactNode;
  /** 작은 사진(짧은 TTL 읽기 URL) */
  cover?: string | null;
  /** 별이 되신 분: 점선 테두리 + 글자(색만으로 구분하지 않음, DESIGN §10.6) */
  memorial?: string | null;
  /** 나 표시 같은 짧은 꼬리표 */
  tag?: string | null;
  /** 있으면 줄 전체가 링크 + 오른쪽에 action 글자 */
  href?: string | null;
  action?: string;
};

/** 우리 탭의 사람, 아이, 반려동물 목록 한 벌(줄 높이 56px, 줄 사이 머리카락 선) */
export function ProfileRows({ rows }: { rows: ProfileRow[] }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => {
        const body = (
          <>
            {row.cover ? (
              // 서명 URL(짧은 TTL)이라 이미지 최적화 경로를 거치지 않는다. 이름이 옆에 있어 꾸밈 그림
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.cover}
                alt=""
                className="size-(--touch) flex-none rounded-full object-cover"
              />
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col wrap-anywhere">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{row.name}</span>
                {row.tag ? (
                  <span className="rounded-sm border-(length:--bw) border-line-strong px-1 text-caption">
                    {row.tag}
                  </span>
                ) : null}
                {row.memorial ? (
                  <span className="inline-flex items-center gap-1 rounded-sm border-(length:--bw) border-dashed border-line-strong px-1 text-caption">
                    <Icon name="star" size="small" />
                    {row.memorial}
                  </span>
                ) : null}
              </span>
              {row.detail ? <span className="text-caption text-fg-muted">{row.detail}</span> : null}
            </span>
            {row.href ? (
              <span className="inline-flex flex-none items-center gap-1 text-caption font-bold whitespace-nowrap text-fg-muted">
                {row.action}
                <Icon name="right" size="small" />
              </span>
            ) : null}
          </>
        );
        const rowClass =
          "flex min-h-(--touch-elder) items-center gap-3 border-b-(length:--bw-hair) border-line py-2";
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} data-press="" className={cn("press", rowClass)}>
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
