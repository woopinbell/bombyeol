import type { MediaStorage } from "./types";

type Stored = { body: Uint8Array; contentType: string };
type Signed = { bytes: number; contentType: string };

/**
 * 로컬 개발 전용 저장소(next dev에서 R2 설정이 없을 때만, from-env.ts). 프로세스 메모리에 두고
 * /api/dev-media 경로가 업로드(PUT)와 읽기(GET)를 맡는다. R2처럼 서명한 길이, 타입과 다른 업로드는 거부한다.
 * 개발 서버를 다시 켜면 비워진다. 운영 빌드에서는 이 경로가 404다.
 */
type DevMemory = { objects: Map<string, Stored>; signed: Map<string, Signed> };

const scope = globalThis as typeof globalThis & { __bombyeolDevMedia?: DevMemory };

export function devMemory(): DevMemory {
  scope.__bombyeolDevMedia ??= { objects: new Map(), signed: new Map() };
  return scope.__bombyeolDevMedia;
}

const url = (key: string) => `/api/dev-media/${key}`;

export function createDevMemoryStorage(): MediaStorage {
  const mem = devMemory();
  return {
    async presignPut(key, { bytes, contentType }) {
      mem.signed.set(key, { bytes, contentType });
      return url(key);
    },
    async head(key) {
      const obj = mem.objects.get(key);
      return obj ? { bytes: obj.body.byteLength, contentType: obj.contentType } : null;
    },
    async copy(fromKey, toKey) {
      const obj = mem.objects.get(fromKey);
      if (!obj) throw new Error(`no such key: ${fromKey}`);
      mem.objects.set(toKey, obj);
    },
    async delete(key) {
      mem.objects.delete(key);
    },
    async presignGet(key) {
      return url(key);
    },
  };
}

/** 개발 PUT: 서명한 길이, 타입과 같아야 받는다(R2의 SignatureDoesNotMatch 흉내) */
export function devMemoryPut(key: string, body: Uint8Array, contentType: string) {
  const mem = devMemory();
  const signed = mem.signed.get(key);
  if (!signed || signed.bytes !== body.byteLength || signed.contentType !== contentType) {
    return false;
  }
  mem.signed.delete(key);
  mem.objects.set(key, { body, contentType });
  return true;
}
