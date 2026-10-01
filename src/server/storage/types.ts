/** 미디어 객체 저장소(R2). 테스트는 메모리 구현을 쓴다. */
export interface MediaStorage {
  /** Content-Length·Content-Type을 서명에 포함한 업로드 URL(G-01) */
  presignPut(
    key: string,
    opts: { bytes: number; contentType: string; expiresSec: number },
  ): Promise<string>;
  /** 객체 메타데이터. 없으면 null */
  head(key: string): Promise<{ bytes: number; contentType: string | null } | null>;
  /** 서버 측 복사(바이트가 Worker를 거치지 않음) */
  copy(fromKey: string, toKey: string): Promise<void>;
  /** 없어도 성공으로 본다 */
  delete(key: string): Promise<void>;
  /** 읽기용 짧은 TTL 서명 URL(영구 public URL 금지, ARCHITECTURE §4) */
  presignGet(key: string, expiresSec: number): Promise<string>;
}

export const mediaKeys = {
  pending: (spaceId: string, assetId: string) => `pending/${spaceId}/${assetId}`,
  final: (spaceId: string, assetId: string) => `spaces/${spaceId}/${assetId}`,
};
