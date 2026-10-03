import { describe, expect, it } from "vitest";
import { crc32, ZipWriter } from "../src/lib/zip";

/** 중앙 디렉터리를 따라 파일을 다시 꺼낸다(store만) */
function readZip(buf: Uint8Array) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const end = buf.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files: { name: string; data: Uint8Array; utf8: boolean; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const flags = view.getUint16(at + 8, true);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(buf.subarray(at + 46, at + 46 + nameLen));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const localName = view.getUint16(local + 26, true);
    const start = local + 30 + localName;
    files.push({ name, data: buf.subarray(start, start + size), utf8: (flags & 0x800) !== 0, crc });
    at += 46 + nameLen;
  }
  return files;
}

describe("내려받기 ZIP", () => {
  it("CRC-32 표준 값", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("한국어 이름, Blob, 글을 담고 다시 꺼내면 같다", async () => {
    const zip = new ZipWriter();
    const photo = new Uint8Array(70_000).map((_, i) => (i * 31) % 251);
    await zip.add("사진/2026-01-01_a.jpg", new Blob([photo], { type: "image/jpeg" }));
    await zip.add("기록/이야기.json", JSON.stringify([{ body: "눈 오던 날" }]));
    expect(zip.count).toBe(2);
    const blob = zip.finish();
    expect(blob.type).toBe("application/zip");
    const files = readZip(new Uint8Array(await blob.arrayBuffer()));
    expect(files.map((f) => f.name)).toEqual(["사진/2026-01-01_a.jpg", "기록/이야기.json"]);
    expect(files.every((f) => f.utf8)).toBe(true);
    expect(files[0].data).toEqual(photo);
    expect(files[0].crc).toBe(crc32(photo));
    expect(JSON.parse(new TextDecoder().decode(files[1].data))).toEqual([{ body: "눈 오던 날" }]);
  });
});
