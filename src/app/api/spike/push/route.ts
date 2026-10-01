import { auth } from "@/auth";
import { sendPush } from "@/server/fcm";

// S-5 스파이크: 로그인한 사용자가 자기 기기 토큰으로만 테스트 푸시를 보낸다.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { token, delaySec } = (await req.json()) as { token?: string; delaySec?: number };
  if (!token || token.length > 4096) return Response.json({ error: "token" }, { status: 400 });
  // 백그라운드 수신 확인용 지연(최대 15초, 대기 시간은 CPU에 포함되지 않음)
  const wait = Math.min(Math.max(Number(delaySec) || 0, 0), 15);
  if (wait) await new Promise((r) => setTimeout(r, wait * 1000));
  const result = await sendPush(token, "봄별 테스트 알림", "S-5 스파이크: Workers에서 보낸 FCM 푸시입니다.");
  return Response.json(result, { status: result.ok ? 200 : 502 });
}

// 진단: 가짜 토큰으로 발송을 시도해 Worker의 JWT 서명·토큰 교환·FCM 호출 경로만 확인(실제 알림은 나가지 않음)
export async function GET() {
  const result = await sendPush("fake-registration-token", "diag", "diag");
  return Response.json({ reachedFcm: result.error === "INVALID_ARGUMENT", ...result });
}
