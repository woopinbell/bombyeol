/**
 * 브라우저에서 만드는 내려받기 ZIP(Phase 7 내보내기 - 서버를 거치지 않는다, S-7과 같은 원칙).
 * 사진, 영상은 이미 압축돼 있으니 압축하지 않고 담는다(store). 이름은 UTF-8(한국어 파일 이름).
 * 파일 내용은 Blob 조각으로 이어 붙여 한 덩어리로 복사하지 않는다(큰 앨범에서 메모리 보호).
 * ZIP64는 쓰지 않는다 - 한 묶음은 부르는 쪽이 4GB보다 훨씬 작게 나눈다(DELETION_POLICY.archiveZipPartBytes).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array, seed = 0): number {
  let crc = ~seed >>> 0;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}

/** ZIP 날짜(MS-DOS, 지역 시각). 1980년 이전은 1980-01-01로 */
function dosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

type Entry = {
  name: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  time: number;
  day: number;
};

const UTF8_FLAG = 1 << 11;
const LIMIT = 0xffffffff;
/** ZIP64 없이 담을 수 있는 파일 수 */
export const MAX_ENTRIES = 0xffff;

export class ZipWriter {
  private parts: BlobPart[] = [];
  private entries: Entry[] = [];
  private offset = 0;

  /** 지금까지 담은 크기(바이트) - 묶음을 나눌 때 본다 */
  get bytes() {
    return this.offset;
  }

  get count() {
    return this.entries.length;
  }

  async add(path: string, content: Blob | Uint8Array | string, modified = new Date()) {
    const data =
      typeof content === "string"
        ? new TextEncoder().encode(content)
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(await content.arrayBuffer());
    const name = new TextEncoder().encode(path);
    const { time, day } = dosDateTime(modified);
    const crc = crc32(data);
    if (this.offset + data.length > LIMIT || this.entries.length >= MAX_ENTRIES) {
      throw new Error("zip: too large");
    }
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, UTF8_FLAG, true);
    header.setUint16(8, 0, true); // store
    header.setUint16(10, time, true);
    header.setUint16(12, day, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    header.setUint16(28, 0, true);
    this.entries.push({ name, crc, size: data.length, offset: this.offset, time, day });
    // Blob이면 원래 Blob을 그대로 이어 붙인다(읽은 사본은 CRC 계산 뒤 버려진다)
    this.parts.push(
      header.buffer,
      name as BlobPart,
      content instanceof Blob ? content : (data as BlobPart),
    );
    this.offset += 30 + name.length + data.length;
  }

  /** 중앙 디렉터리를 붙여 ZIP을 끝낸다 */
  finish(): Blob {
    const start = this.offset;
    const central: BlobPart[] = [];
    let size = 0;
    for (const e of this.entries) {
      const h = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x02014b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 20, true);
      h.setUint16(8, UTF8_FLAG, true);
      h.setUint16(10, 0, true);
      h.setUint16(12, e.time, true);
      h.setUint16(14, e.day, true);
      h.setUint32(16, e.crc, true);
      h.setUint32(20, e.size, true);
      h.setUint32(24, e.size, true);
      h.setUint16(28, e.name.length, true);
      h.setUint32(42, e.offset, true);
      central.push(h.buffer, e.name as BlobPart);
      size += 46 + e.name.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, start, true);
    return new Blob([...this.parts, ...central, end.buffer], { type: "application/zip" });
  }
}
