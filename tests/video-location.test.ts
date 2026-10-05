import { describe, expect, it } from "vitest";
import { stripVideoLocation } from "@/lib/video-location";

const enc = new TextEncoder();

/** 상자 하나: 크기 4 + 종류 4 + 내용 */
function box(type: string | number[], ...children: Uint8Array[]) {
  const body = concat(...children);
  const out = new Uint8Array(8 + body.length);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set(typeof type === "string" ? [...type].map((c) => c.charCodeAt(0)) : type, 4);
  out.set(body, 8);
  return out;
}
function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
};
const KYIV = "+50.4501+030.5234/";

// 아이폰식: moov/meta(hdlr, keys, ilst) + 안드로이드식: moov/udta/©xyz, 그리고 mdat
function sampleMovie() {
  const key = (name: string) => concat(u32(8 + name.length), enc.encode("mdta"), enc.encode(name));
  const keys = box(
    "keys",
    u32(0),
    u32(2),
    key("com.apple.quicktime.make"),
    key("com.apple.quicktime.location.ISO6709"),
  );
  const item = (index: number, value: string) =>
    box(u32(index) as unknown as number[], box("data", u32(1), u32(0), enc.encode(value)));
  const ilst = box("ilst", item(1, "Apple"), item(2, KYIV));
  const meta = box("meta", box("hdlr", new Uint8Array(24)), keys, ilst);
  const xyz = box([0xa9, 0x78, 0x79, 0x7a], u32(KYIV.length << 16), enc.encode(KYIV));
  const moov = box("moov", box("mvhd", new Uint8Array(100)), box("udta", xyz), meta);
  const mdat = box("mdat", enc.encode("frames..."));
  return concat(box("ftyp", enc.encode("qt  ")), moov, mdat);
}

async function bytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("영상 위치 정보 지우기(PRIVACY §4)", () => {
  it("©xyz와 아이폰 location 값을 지우고 크기, 나머지 내용은 그대로 둔다", async () => {
    const original = sampleMovie();
    const out = await bytes(
      await stripVideoLocation(new Blob([original], { type: "video/quicktime" })),
    );
    expect(out.length).toBe(original.length);
    const text = new TextDecoder("latin1").decode(out);
    expect(text).not.toContain("50.4501");
    // 위치가 아닌 값과 영상 데이터는 남는다
    expect(text).toContain("Apple");
    expect(text).toContain("frames...");
    expect(text.slice(-17)).toBe(new TextDecoder("latin1").decode(original).slice(-17));
  });

  it("위치가 없거나 구조를 모르면 원래 Blob을 그대로 돌려준다", async () => {
    const plain = new Blob([
      concat(box("ftyp", enc.encode("isom")), box("moov", box("mvhd", new Uint8Array(100)))),
    ]);
    expect(await stripVideoLocation(plain)).toBe(plain);
    const junk = new Blob([enc.encode("not a movie at all")]);
    expect(await stripVideoLocation(junk)).toBe(junk);
  });
});
