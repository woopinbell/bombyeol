/**
 * JPEG의 촬영 시각(EXIF DateTimeOriginal, 없으면 DateTime)을 읽는다. 사진을 다시 인코딩하면 EXIF가 사라지므로
 * (위치 정보도 함께 지워진다) 올리기 전에 원본 바이트에서 먼저 읽는다. 시간대 정보(OffsetTimeOriginal)가 없으면
 * 기본 시간대(한국)로 본다. 못 읽으면 null.
 */
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME = 0x0132;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_OFFSET_ORIGINAL = 0x9011;

export function readExifDate(buffer: ArrayBuffer, defaultOffset = "+09:00"): Date | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let pos = 2;
  while (pos + 4 <= view.byteLength) {
    const marker = view.getUint16(pos);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
    const length = view.getUint16(pos + 2);
    if (marker === 0xffe1 && isExifHeader(view, pos + 4)) {
      return readTiff(view, pos + 10, Math.min(view.byteLength, pos + 2 + length), defaultOffset);
    }
    pos += 2 + length;
  }
  return null;
}

function isExifHeader(view: DataView, at: number) {
  return (
    at + 6 <= view.byteLength && view.getUint32(at) === 0x45786966 && view.getUint16(at + 4) === 0
  );
}

function readTiff(view: DataView, start: number, end: number, defaultOffset: string): Date | null {
  if (start + 8 > end) return null;
  const little = view.getUint16(start) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const ascii = (at: number, count: number) => {
    let s = "";
    for (let i = 0; i < count && at + i < end; i++) {
      const c = view.getUint8(at + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const readIfd = (offset: number) => {
    const tags = new Map<number, string | number>();
    const at = start + offset;
    if (offset <= 0 || at + 2 > end) return tags;
    const count = u16(at);
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12;
      if (entry + 12 > end) break;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const n = u32(entry + 4);
      if (type === 2) tags.set(tag, ascii(n <= 4 ? entry + 8 : start + u32(entry + 8), n));
      else if (type === 4) tags.set(tag, u32(entry + 8));
    }
    return tags;
  };

  const ifd0 = readIfd(u32(start + 4));
  const exifOffset = ifd0.get(TAG_EXIF_IFD);
  const exif = typeof exifOffset === "number" ? readIfd(exifOffset) : new Map();
  const stamp = exif.get(TAG_DATETIME_ORIGINAL) ?? ifd0.get(TAG_DATETIME);
  const offset = exif.get(TAG_OFFSET_ORIGINAL);
  return parseExifStamp(
    typeof stamp === "string" ? stamp : "",
    typeof offset === "string" && /^[+-]\d\d:\d\d$/.test(offset) ? offset : defaultOffset,
  );
}

/** "YYYY:MM:DD HH:MM:SS" + 시간대 → Date. 형식이 다르거나 날짜가 비어 있으면(0000:00:00) null */
export function parseExifStamp(stamp: string, offset: string): Date | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(stamp.trim());
  if (!m || m[1] === "0000") return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
