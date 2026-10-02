import type { PushMessage, PushSender, SendOutcome } from "./types";

// FCM HTTP v1 발송(S-5): Workers에서는 firebase-admin 대신 서비스 계정 JWT(RS256)를
// WebCrypto로 서명해 액세스 토큰을 받고 fetch로 보낸다.

export type FcmConfig = { projectId: string; clientEmail: string; privateKey: string };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** 알림이 늦게 도착할 바에는 버린다(기기가 하루 넘게 꺼져 있던 경우) */
const WEBPUSH_TTL_SEC = 24 * 60 * 60;

// 액세스 토큰은 isolate 안에서 만료 1분 전까지 재사용한다(요청마다 토큰 교환을 하지 않게).
let cached: { key: string; token: string; exp: number } | null = null;

function b64url(data: ArrayBuffer | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** `\n` 이스케이프, 실제 줄바꿈, 감싼 따옴표 모두 받는다(ENV_MANIFEST Phase 6) */
export function pemBody(pem: string) {
  return pem
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
}

async function importKey(pem: string) {
  const der = Uint8Array.from(atob(pemBody(pem)), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** 실패 단계를 남기는 오류(스모크 진단용 - 메시지에 키, 토큰 값을 넣지 않는다) */
export class FcmStageError extends Error {
  constructor(
    readonly stage: "key" | "token",
    detail: string,
  ) {
    super(`${stage}: ${detail}`);
    this.name = "FcmStageError";
  }
}

async function accessToken(config: FcmConfig, fetcher: typeof fetch) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.key === config.clientEmail && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  let key: CryptoKey;
  try {
    key = await importKey(config.privateKey);
  } catch (error) {
    throw new FcmStageError("key", (error as Error).name);
  }
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const res = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) {
    // Google 오류 코드, 설명(예: invalid_grant / Invalid JWT Signature)만 남긴다
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new FcmStageError(
      "token",
      `${res.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim().slice(0, 120),
    );
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { key: config.clientEmail, token: json.access_token, exp: now + json.expires_in };
  return cached.token;
}

type FcmError = {
  error?: { status?: string; message?: string; details?: { errorCode?: string }[] };
};

/**
 * 응답을 세 갈래로 나눈다. 토큰을 지우는 건 FCM이 토큰 문제라고 답했을 때만이다 - * INVALID_ARGUMENT는 페이로드 문제일 수도 있어 등록 토큰을 가리킬 때만 지운다(전체 토큰 소실 방지).
 */
export function classifyFcmResponse(status: number, body: FcmError): SendOutcome {
  if (status >= 200 && status < 300) return "ok";
  const codes = [body.error?.status, ...(body.error?.details ?? []).map((d) => d.errorCode)];
  if (codes.includes("UNREGISTERED") || codes.includes("SENDER_ID_MISMATCH")) {
    return "invalid_token";
  }
  if (codes.includes("INVALID_ARGUMENT") && /registration token/i.test(body.error?.message ?? "")) {
    return "invalid_token";
  }
  return "error";
}

async function post(config: FcmConfig, fetcher: typeof fetch, token: string, message: PushMessage) {
  const auth = await accessToken(config, fetcher);
  const res = await fetcher(
    `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: { ...message.data, link: message.link },
          webpush: {
            headers: { TTL: String(WEBPUSH_TTL_SEC) },
            fcm_options: { link: message.link },
          },
        },
      }),
    },
  );
  if (res.status === 401) cached = null; // 키가 바뀐 경우 다음 발송에서 다시 교환
  const body = res.ok ? {} : ((await res.json().catch(() => ({}))) as FcmError);
  return { status: res.status, body };
}

export function createFcmSender(config: FcmConfig, fetcher: typeof fetch = fetch): PushSender {
  return {
    async send(token: string, message: PushMessage) {
      try {
        const { status, body } = await post(config, fetcher, token, message);
        return classifyFcmResponse(status, body);
      } catch {
        return "error";
      }
    },
  };
}

/** 개인 키 문자열의 모양(값 없이): 시작 표시, 이스케이프 줄바꿈, 실제 줄바꿈, 본문 길이 */
export function keyShape(pem: string) {
  return [
    `begin=${pem.includes("BEGIN PRIVATE KEY") ? "y" : "n"}`,
    `escaped=${pem.includes("\\n") ? "y" : "n"}`,
    `newline=${pem.includes("\n") ? "y" : "n"}`,
    `quoted=${/^\s*"/.test(pem) ? "y" : "n"}`,
    `body=${pemBody(pem).length}`,
  ].join(" ");
}

/**
 * 배포 스모크용 진단: 가짜 등록 토큰으로 보내고 어느 단계에서 멈췄는지 돌려준다.
 * 기대값은 `invalid_token`(키, 토큰 교환, FCM 호출이 모두 정상). 키, 토큰 값은 결과에 넣지 않는다.
 */
export async function probeFcm(
  config: FcmConfig,
  link: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  try {
    const { status, body } = await post(config, fetcher, "bombyeol-smoke-invalid-token", {
      title: "smoke",
      body: "smoke",
      link,
      data: { type: "smoke" },
    });
    const outcome = classifyFcmResponse(status, body);
    if (outcome !== "error") return outcome;
    return `send: ${status} ${body.error?.status ?? ""}`.trim();
  } catch (error) {
    if (error instanceof FcmStageError) {
      return error.stage === "key"
        ? `${error.message} (${keyShape(config.privateKey)})`
        : error.message;
    }
    return `fail: ${(error as Error).name}`;
  }
}

/**
 * 요청 환경의 서비스 계정으로 발송기를 만든다. 설정이 없는 환경(키 미등록 스테이징, 로컬)은
 * null - 알림만 건너뛰고 기능은 그대로 동작한다.
 */
export function fcmConfigFromEnv(env: CloudflareEnv): FcmConfig | null {
  const config = {
    projectId: env.FIREBASE_ADMIN_PROJECT_ID ?? "",
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY ?? "",
  };
  return Object.values(config).every(Boolean) ? config : null;
}

export function fcmSenderFromEnv(env: CloudflareEnv): PushSender | null {
  const config = fcmConfigFromEnv(env);
  return config ? createFcmSender(config) : null;
}
