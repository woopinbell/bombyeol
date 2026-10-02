import { describe, expect, it } from "vitest";
import { bytesForDisplay, storageRatio } from "../src/lib/storage-display";

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe("저장 공간 표시", () => {
  it("1GB 미만은 MB 올림, 그 이상은 GB 소수 한 자리", () => {
    expect(bytesForDisplay(0)).toEqual({ value: 0, unit: "megabyte", fraction: 0 });
    expect(bytesForDisplay(1)).toEqual({ value: 1, unit: "megabyte", fraction: 0 });
    expect(bytesForDisplay(300 * MB + 1)).toEqual({ value: 301, unit: "megabyte", fraction: 0 });
    expect(bytesForDisplay(GB)).toEqual({ value: 1, unit: "gigabyte", fraction: 1 });
    expect(bytesForDisplay(1.26 * GB)).toEqual({ value: 1.3, unit: "gigabyte", fraction: 1 });
  });

  it("비율은 0~1로 자르고 90%부터 거의 다 찼다고 본다", () => {
    expect(storageRatio(0, 2 * GB)).toEqual({ ratio: 0, nearFull: false });
    expect(storageRatio(1.79 * GB, 2 * GB).nearFull).toBe(false);
    expect(storageRatio(1.8 * GB, 2 * GB).nearFull).toBe(true);
    expect(storageRatio(3 * GB, 2 * GB)).toEqual({ ratio: 1, nearFull: true });
    expect(storageRatio(5, 0)).toEqual({ ratio: 1, nearFull: true });
  });
});
