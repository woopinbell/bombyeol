import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn — 토큰 클래스 병합", () => {
  it("글자 크기와 글자 색을 함께 남긴다", () => {
    expect(cn("text-body", "text-fg")).toBe("text-body text-fg");
    expect(cn("text-title-s text-on-strong")).toBe("text-title-s text-on-strong");
  });
  it("같은 묶음은 뒤의 것이 이긴다", () => {
    expect(cn("text-body", "text-title")).toBe("text-title");
    expect(cn("rounded-md", "rounded-lg")).toBe("rounded-lg");
    expect(cn("font-regular", "font-bold")).toBe("font-bold");
  });
});
