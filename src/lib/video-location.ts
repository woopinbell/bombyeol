// 영상(MP4, MOV) 위치 정보 지우기(PRIVACY §4 열린 과제, 2026-10-05). 다시 인코딩하지 않는다.
// 위치는 moov 안의 작은 상자에 있다: udta/©xyz(QuickTime, 안드로이드), udta/loci(3GPP),
// meta(keys + ilst)의 com.apple.quicktime.location.*(아이폰). 그 상자를 같은 크기의 free 상자로 바꾸고
// 내용을 0으로 덮는다. 크기가 그대로라 영상 데이터 위치(stco 오프셋)가 바뀌지 않는다.

/** moov가 이보다 크면(비정상) 건드리지 않는다 - 휴대폰 메모리 보호 */
const MAX_MOOV_BYTES = 32 * 1024 * 1024;
const CONTAINERS = new Set(["moov", "trak", "udta", "mdia", "minf"]);
const LOCATION_BOXES = new Set(["©xyz", "loci"]);
const FREE = [0x66, 0x72, 0x65, 0x65]; // "free"

function fourcc(buf: Uint8Array, at: number) {
  return String.fromCharCode(buf[at], buf[at + 1], buf[at + 2], buf[at + 3]);
}

function u32(buf: Uint8Array, at: number) {
  return new DataView(buf.buffer, buf.byteOffset + at, 4).getUint32(0);
}

/** [start, end) 안의 상자들: 위치, 크기, 머리 길이, 종류 */
function* boxes(buf: Uint8Array, start: number, end: number) {
  let at = start;
  while (at + 8 <= end) {
    let size = u32(buf, at);
    let header = 8;
    if (size === 1) {
      if (at + 16 > end) return;
      size = Number(new DataView(buf.buffer, buf.byteOffset + at + 8, 8).getBigUint64(0));
      header = 16;
    } else if (size === 0) {
      size = end - at;
    }
    if (size < header || at + size > end) return;
    yield { at, size, header, type: fourcc(buf, at + 4) };
    at += size;
  }
}

/** 상자를 같은 크기의 free 상자로(내용은 0) */
function blank(buf: Uint8Array, box: { at: number; size: number; header: number }) {
  buf.set(FREE, box.at + 4);
  buf.fill(0, box.at + box.header, box.at + box.size);
}

/** meta 상자: ISO는 버전 4바이트가 앞에 있고 QuickTime은 없다. 첫 자식이 hdlr인지로 가린다 */
function metaChildrenStart(buf: Uint8Array, at: number, header: number, end: number) {
  const plain = at + header;
  return plain + 8 <= end && fourcc(buf, plain + 4) === "hdlr" ? plain : plain + 4;
}

function scrubMeta(buf: Uint8Array, start: number, end: number): boolean {
  let changed = false;
  const locationKeys = new Set<number>();
  let ilst: { at: number; size: number; header: number } | null = null;
  for (const box of boxes(buf, start, end)) {
    if (box.type === "keys") {
      // 버전 4 + 개수 4, 이어서 [크기 4, 이름공간 4, 이름]
      let at = box.at + box.header + 8;
      for (let index = 1; at + 8 <= box.at + box.size; index++) {
        const size = u32(buf, at);
        if (size < 8) break;
        const name = new TextDecoder().decode(buf.subarray(at + 8, at + size));
        if (name.includes("location")) locationKeys.add(index);
        at += size;
      }
    } else if (box.type === "ilst") {
      ilst = box;
    } else if (LOCATION_BOXES.has(box.type)) {
      blank(buf, box);
      changed = true;
    }
  }
  if (ilst && locationKeys.size) {
    for (const item of boxes(buf, ilst.at + ilst.header, ilst.at + ilst.size)) {
      if (locationKeys.has(u32(buf, item.at + 4))) {
        blank(buf, item);
        changed = true;
      }
    }
  }
  return changed;
}

function scrub(buf: Uint8Array, start: number, end: number): boolean {
  let changed = false;
  for (const box of boxes(buf, start, end)) {
    if (LOCATION_BOXES.has(box.type)) {
      blank(buf, box);
      changed = true;
    } else if (box.type === "meta") {
      const from = metaChildrenStart(buf, box.at, box.header, box.at + box.size);
      changed = scrubMeta(buf, from, box.at + box.size) || changed;
    } else if (CONTAINERS.has(box.type)) {
      changed = scrub(buf, box.at + box.header, box.at + box.size) || changed;
    }
  }
  return changed;
}

/**
 * 영상 파일에서 위치 정보 상자를 지운 새 Blob(크기 같음). 위치가 없거나 구조를 모르면 원래 파일 그대로.
 * moov만 메모리에 읽고 나머지(mdat)는 원래 파일 조각을 그대로 잇는다.
 */
export async function stripVideoLocation(file: Blob): Promise<Blob> {
  const parts: BlobPart[] = [];
  let last = 0;
  let at = 0;
  while (at + 8 <= file.size) {
    const head = new Uint8Array(await file.slice(at, at + 16).arrayBuffer());
    let size = u32(head, 0);
    let header = 8;
    if (size === 1 && head.length >= 16) {
      size = Number(new DataView(head.buffer).getBigUint64(8));
      header = 16;
    } else if (size === 0) {
      size = file.size - at;
    }
    if (size < header || at + size > file.size) break;
    if (fourcc(head, 4) === "moov" && size <= MAX_MOOV_BYTES) {
      const moov = new Uint8Array(await file.slice(at, at + size).arrayBuffer());
      if (scrub(moov, header, size)) {
        parts.push(file.slice(last, at), moov);
        last = at + size;
      }
    }
    at += size;
  }
  if (parts.length === 0) return file;
  parts.push(file.slice(last));
  return new Blob(parts, { type: file.type });
}
