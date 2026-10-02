import type { PrismaClient } from "@/generated/prisma/client";
import type { PushSender } from "./types";

/** 응답 뒤에 실행되는 알림 작업이 쓰는 것들 */
export type PushDeps = {
  prisma: PrismaClient;
  /** 발송 설정이 없는 환경은 null - 작업을 건너뛴다 */
  sender: PushSender | null;
  /** 링크를 절대 URL로 만들 요청 출처 */
  origin: string;
};

export type PushTask = (deps: PushDeps & { sender: PushSender }) => Promise<unknown>;

/**
 * 기록 저장이 끝난 뒤 알림을 응답 바깥에서(waitUntil) 처리한다.
 * 알림 실패는 기록 저장 결과에 영향을 주지 않는다 - 오류는 삼키고 개인정보 없이 로그만 남긴다.
 */
export interface PushDispatcher {
  defer(task: PushTask): void;
}

export function createPushDispatcher(
  deps: PushDeps,
  schedule: (work: Promise<unknown>) => void,
): PushDispatcher {
  return {
    defer(task) {
      const { sender } = deps;
      if (!sender) return;
      schedule(
        task({ ...deps, sender }).catch((error: unknown) => {
          console.error("[push] 발송 실패", error instanceof Error ? error.name : "unknown");
        }),
      );
    },
  };
}

/** 알림을 보내지 않는 디스패처(내부 경로, 테스트 기본값) */
export const noPush: PushDispatcher = { defer() {} };
