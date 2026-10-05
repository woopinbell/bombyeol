import { describe, expect, it } from "vitest";
import { pagesUntil } from "@/server/open-target";

// 한 페이지에 2개씩, 커서는 다음 시작 위치
const all = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id }));
const pageAt = async (start: number) => ({
  items: all.slice(start, start + 2),
  nextCursor: start + 2 < all.length ? start + 2 : null,
});

describe("알림으로 연 지난 기록 찾기", () => {
  it("첫 페이지에 있으면 더 불러오지 않는다", async () => {
    let calls = 0;
    const page = await pagesUntil(await pageAt(0), "b", (c) => (calls++, pageAt(c)));
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(calls).toBe(0);
  });

  it("지난 기록이면 나올 때까지 이어 붙이고 커서는 이어서 쓸 수 있다", async () => {
    const page = await pagesUntil(await pageAt(0), "e", pageAt);
    expect(page.items.map((i) => i.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(page.nextCursor).toBe(6);
  });

  it("상한까지 못 찾으면 거기서 멈춘다(없는 id, open 없음)", async () => {
    expect((await pagesUntil(await pageAt(0), "zz", pageAt, 1)).items).toHaveLength(4);
    expect((await pagesUntil(await pageAt(0), null, pageAt)).items).toHaveLength(2);
  });
});
