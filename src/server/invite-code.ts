// 초대코드: 6자, 헷갈리는 문자(0/O, 1/I/L) 제외 31종 → 약 8.9억 가지.
// 짧은 TTL·1회용·입력 실패 제한(G-07·G-11)과 함께 쓴다.
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;

export function generateInviteCode(): string {
  const n = INVITE_ALPHABET.length;
  // 모듈로 편향을 없애기 위해 n의 배수 미만 값만 쓴다(거부 샘플링).
  const max = Math.floor(256 / n) * n;
  let code = "";
  while (code.length < INVITE_CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) {
      if (b < max && code.length < INVITE_CODE_LENGTH) code += INVITE_ALPHABET[b % n];
    }
  }
  return code;
}

/** 사용자 입력을 정규화(대소문자·공백·하이픈 무시). 형식이 틀리면 null */
export function normalizeInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== INVITE_CODE_LENGTH) return null;
  for (const ch of code) if (!INVITE_ALPHABET.includes(ch)) return null;
  return code;
}
