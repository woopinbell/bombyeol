import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

/** 프로시저 메타 */
export type Meta = {
  /** Space 삭제 유예 중에도 허용하는 쓰기(취소, 나가기, 동의 철회처럼 거두는 동작만) */
  allowWhileDeleting?: boolean;
};

const t = initTRPC.context<Context>().meta<Meta>().create({ transformer: superjson });

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
