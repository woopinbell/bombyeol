/** 알림으로 연 기록(?open=)을 찾으려고 첫 화면에서 더 불러올 최대 페이지 수(DB 왕복 상한) */
export const OPEN_TARGET_MAX_PAGES = 5;

type Page<T, C> = { items: T[]; nextCursor: C | null };

/**
 * 알림으로 연 기록이 첫 페이지 밖(지난 기록)이면 그 기록이 나올 때까지 다음 페이지를 이어 붙인다.
 * 날짜 순서와 커서는 그대로라 "더 보기"가 이어서 동작한다. 상한까지 못 찾으면 탭만 연 상태로 둔다.
 */
export async function pagesUntil<T extends { id: string }, C>(
  first: Page<T, C>,
  openId: string | null | undefined,
  next: (cursor: C) => Promise<Page<T, C>>,
  maxExtra = OPEN_TARGET_MAX_PAGES,
): Promise<Page<T, C>> {
  let page = first;
  for (let i = 0; openId && page.nextCursor !== null && i < maxExtra; i++) {
    if (page.items.some((item) => item.id === openId)) break;
    const more = await next(page.nextCursor);
    page = { items: [...page.items, ...more.items], nextCursor: more.nextCursor };
  }
  return page;
}
