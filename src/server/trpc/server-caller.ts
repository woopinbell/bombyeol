import { headers } from "next/headers";
import { auth } from "@/auth";
import { requestOrigin } from "@/server/request-origin";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "./init";
import { requestContext } from "./request-context";

const createCaller = createCallerFactory(appRouter);

/** 서버 컴포넌트, 서버 액션에서 tRPC 프로시저를 부른다(같은 권한 검사, 레이트 리밋). */
export async function serverCaller() {
  const [session, h, origin] = await Promise.all([auth(), headers(), requestOrigin()]);
  return createCaller(
    requestContext({
      userId: session?.userId ?? null,
      ip: h.get("cf-connecting-ip") ?? "local",
      origin,
    }),
  );
}
