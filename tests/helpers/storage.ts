import type { MediaStorage } from "@/server/storage/types";

type Stored = { bytes: number; contentType: string };

/**
 * 테스트용 메모리 저장소. presignPut이 서명한 길이·타입과 다른 업로드는 R2처럼 거부한다
 * (S-3에서 실제 R2가 SignatureDoesNotMatch로 거부함을 확인).
 */
export class MemoryStorage implements MediaStorage {
  objects = new Map<string, Stored>();
  signed = new Map<string, Stored>();
  deleted: string[] = [];

  async presignPut(key: string, opts: { bytes: number; contentType: string }) {
    this.signed.set(key, { bytes: opts.bytes, contentType: opts.contentType });
    return `memory://put/${key}`;
  }

  /** 클라이언트 PUT 흉내. 서명과 다르면 false(403) */
  upload(key: string, bytes: number, contentType: string) {
    const signed = this.signed.get(key);
    if (!signed || signed.bytes !== bytes || signed.contentType !== contentType) return false;
    this.objects.set(key, { bytes, contentType });
    return true;
  }

  /** 서명을 우회해 객체를 직접 넣는다(이상 상황 재현용) */
  forcePut(key: string, bytes: number, contentType: string) {
    this.objects.set(key, { bytes, contentType });
  }

  async head(key: string) {
    return this.objects.get(key) ?? null;
  }

  async copy(fromKey: string, toKey: string) {
    const obj = this.objects.get(fromKey);
    if (!obj) throw new Error(`no such key: ${fromKey}`);
    this.objects.set(toKey, { ...obj });
  }

  async delete(key: string) {
    this.objects.delete(key);
    this.deleted.push(key);
  }

  async presignGet(key: string) {
    return `memory://get/${key}`;
  }
}
