import { headers } from "next/headers";
import { auth } from "@/auth";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "./init";
import { requestContext } from "./request-context";

const createCaller = createCallerFactory(appRouter);

/** 서버 컴포넌트, 서버 액션에서 tRPC 프로시저를 부른다(같은 권한 검사, 레이트 리밋). */
export async function serverCaller() {
  const [session, h] = await Promise.all([auth(), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return createCaller(
    requestContext({
      userId: session?.userId ?? null,
      ip: h.get("cf-connecting-ip") ?? "local",
      origin: `${proto}://${host}`,
    }),
  );
}
