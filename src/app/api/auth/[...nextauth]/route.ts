import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { RATE_LIMITS } from "@/lib/plan";
import { createPrisma } from "@/server/db";
import { hitRateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/trpc/context";

// G-07: 로그인 시작(signin), OAuth 콜백(callback)에 IP당 레이트 리밋.
const LIMITED = /\/api\/auth\/(signin|callback)\//;

async function limited(req: NextRequest) {
  if (!LIMITED.test(req.nextUrl.pathname)) return false;
  const ok = await hitRateLimit(createPrisma(), `auth:${clientIp(req)}`, RATE_LIMITS.authPerIp);
  return !ok;
}

export async function GET(req: NextRequest) {
  if (await limited(req)) return new Response(null, { status: 429 });
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (await limited(req)) return new Response(null, { status: 429 });
  return handlers.POST(req);
}
