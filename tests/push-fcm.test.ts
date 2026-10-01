import { describe, expect, it } from "vitest";
import { classifyFcmResponse, createFcmSender, pemBody } from "@/server/push/fcm";

async function serviceAccount() {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der));
  const lines = b64.match(/.{1,64}/g)!.join("\\n");
  return {
    publicKey: pair.publicKey,
    // 환경변수에 흔한 형태: 따옴표 + \n 이스케이프
    privateKey: `"-----BEGIN PRIVATE KEY-----\\n${lines}\\n-----END PRIVATE KEY-----\\n"`,
  };
}

function fromB64url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );
}

const message = {
  title: "봄별",
  body: "새 소식이 있어요",
  link: "https://bombyeol.test/open/x/1",
  data: { type: "x", id: "1" },
};

describe("FCM 발송(S-5 계승)", () => {
  it("개인 키는 \\n 이스케이프·실제 줄바꿈·따옴표를 모두 받는다", () => {
    const real = "-----BEGIN PRIVATE KEY-----\nAAAA\nBBBB\n-----END PRIVATE KEY-----\n";
    const escaped = '"-----BEGIN PRIVATE KEY-----\\nAAAA\\nBBBB\\n-----END PRIVATE KEY-----\\n"';
    expect(pemBody(real)).toBe("AAAABBBB");
    expect(pemBody(escaped)).toBe("AAAABBBB");
  });

  it("서비스 계정 JWT(RS256)로 토큰을 받고, 토큰은 재사용하며, 고정 문구만 보낸다", async () => {
    const account = await serviceAccount();
    const calls: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("oauth2")) {
        return Response.json({ access_token: "at-1", expires_in: 3600 });
      }
      return Response.json({ name: "projects/p/messages/1" });
    }) as typeof fetch;
    const sender = createFcmSender(
      {
        projectId: "p",
        clientEmail: "svc-a@p.iam.gserviceaccount.com",
        privateKey: account.privateKey,
      },
      fetcher,
    );
    expect(await sender.send("tok-1", message)).toBe("ok");
    expect(await sender.send("tok-2", message)).toBe("ok");
    expect(calls.filter((c) => c.url.includes("oauth2"))).toHaveLength(1);

    const assertion = new URLSearchParams(String(calls[0].init.body)).get("assertion")!;
    const [h, c, s] = assertion.split(".");
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      account.publicKey,
      fromB64url(s),
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(verified).toBe(true);
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(c)));
    expect(claims.scope).toBe("https://www.googleapis.com/auth/firebase.messaging");

    const send = calls[1];
    expect(send.url).toBe("https://fcm.googleapis.com/v1/projects/p/messages:send");
    expect(new Headers(send.init.headers).get("authorization")).toBe("Bearer at-1");
    const payload = JSON.parse(String(send.init.body)).message;
    expect(payload).toMatchObject({
      token: "tok-1",
      notification: { title: message.title, body: message.body },
      data: { type: "x", id: "1", link: message.link },
      webpush: { fcm_options: { link: message.link } },
    });
  });

  it("토큰 교환이 실패하면 error(발송하지 않음)", async () => {
    const account = await serviceAccount();
    const fetcher = (async () => new Response("no", { status: 400 })) as typeof fetch;
    const sender = createFcmSender(
      {
        projectId: "p",
        clientEmail: "svc-b@p.iam.gserviceaccount.com",
        privateKey: account.privateKey,
      },
      fetcher,
    );
    expect(await sender.send("tok", message)).toBe("error");
  });

  it("응답 분류: 토큰 문제일 때만 invalid_token", () => {
    expect(classifyFcmResponse(200, {})).toBe("ok");
    expect(
      classifyFcmResponse(404, {
        error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] },
      }),
    ).toBe("invalid_token");
    expect(
      classifyFcmResponse(403, {
        error: { status: "PERMISSION_DENIED", details: [{ errorCode: "SENDER_ID_MISMATCH" }] },
      }),
    ).toBe("invalid_token");
    expect(
      classifyFcmResponse(400, {
        error: {
          status: "INVALID_ARGUMENT",
          message: "The registration token is not a valid FCM registration token",
        },
      }),
    ).toBe("invalid_token");
    // 페이로드 문제로 보이는 INVALID_ARGUMENT는 토큰을 지우지 않는다
    expect(
      classifyFcmResponse(400, {
        error: { status: "INVALID_ARGUMENT", message: "Invalid JSON payload" },
      }),
    ).toBe("error");
    expect(classifyFcmResponse(429, { error: { status: "RESOURCE_EXHAUSTED" } })).toBe("error");
    expect(classifyFcmResponse(503, {})).toBe("error");
  });
});
