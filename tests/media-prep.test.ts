import { describe, expect, it } from "vitest";
import { parseExifStamp, readExifDate } from "@/lib/exif-date";
import { springCurve } from "@/lib/spring";
import tokens from "@/design/tokens.json";

/** 최소 JPEG: SOI + APP1(Exif, IFD0 → Exif IFD → DateTimeOriginal[, OffsetTimeOriginal]) + SOS */
function jpegWithExif(
  stamp: string,
  { little = true, offset }: { little?: boolean; offset?: string } = {},
) {
  const tiff: number[] = [];
  const u16 = (v: number) => (little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) =>
    little
      ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24]
      : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  const text = (s: string) => [...s].map((c) => c.charCodeAt(0)).concat(0);
  const exifEntries = offset ? 2 : 1;
  // 레이아웃: 헤더(8) | IFD0(2+12+4=18) | ExifIFD(2+12n+4) | 문자열들
  const ifd0At = 8;
  const exifAt = ifd0At + 18;
  const dataAt = exifAt + 2 + 12 * exifEntries + 4;
  const stampBytes = text(stamp);
  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(ifd0At));
  tiff.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifAt), ...u32(0));
  tiff.push(
    ...u16(exifEntries),
    ...u16(0x9003),
    ...u16(2),
    ...u32(stampBytes.length),
    ...u32(dataAt),
  );
  if (offset) {
    tiff.push(...u16(0x9011), ...u16(2), ...u32(7), ...u32(dataAt + stampBytes.length));
  }
  tiff.push(...u32(0), ...stampBytes, ...(offset ? text(offset) : []));
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const bytes = [
    0xff,
    0xd8,
    0xff,
    0xe1,
    (app1.length + 2) >> 8,
    (app1.length + 2) & 0xff,
    ...app1,
    0xff,
    0xda,
    0,
    2,
  ];
  return new Uint8Array(bytes).buffer;
}

describe("사진 촬영 시각(EXIF)", () => {
  it("DateTimeOriginal을 한국 시간으로 읽는다(리틀, 빅 엔디언)", () => {
    expect(readExifDate(jpegWithExif("2025:05:05 14:30:00"))?.toISOString()).toBe(
      "2025-05-05T05:30:00.000Z",
    );
    expect(
      readExifDate(jpegWithExif("2025:05:05 14:30:00", { little: false }))?.toISOString(),
    ).toBe("2025-05-05T05:30:00.000Z");
  });

  it("시간대가 적혀 있으면 그것을 쓴다", () => {
    expect(
      readExifDate(jpegWithExif("2025:05:05 14:30:00", { offset: "+02:00" }))?.toISOString(),
    ).toBe("2025-05-05T12:30:00.000Z");
  });

  it("JPEG가 아니거나 EXIF, 날짜가 없으면 null", () => {
    expect(readExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(readExifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
    expect(readExifDate(jpegWithExif("0000:00:00 00:00:00"))).toBeNull();
    expect(parseExifStamp("2025-05-05 14:30:00", "+09:00")).toBeNull();
  });

  it("잘린 파일에서도 던지지 않는다", () => {
    const full = new Uint8Array(jpegWithExif("2025:05:05 14:30:00"));
    for (let n = 0; n < full.length; n += 7) {
      expect(() => readExifDate(full.slice(0, n).buffer)).not.toThrow();
    }
  });
});

describe("스프링 곡선(CSS linear)", () => {
  it("settle 토큰: 0에서 시작해 1에서 끝나고 1초 안에 멈춘다", () => {
    const settle = tokens.motion["spring-settle"];
    const { duration, easing } = springCurve(settle);
    expect(easing.startsWith("linear(0, ")).toBe(true);
    expect(easing.endsWith(", 1)")).toBe(true);
    expect(duration).toBeGreaterThan(300);
    expect(duration).toBeLessThan(1000);
  });

  it("감쇠가 작으면 1을 넘었다 돌아온다(튀는 느낌)", () => {
    const { easing } = springCurve({ stiffness: 300, damping: 10 });
    const values = easing.slice(7, -1).split(", ").map(Number);
    expect(Math.max(...values)).toBeGreaterThan(1);
  });
});
