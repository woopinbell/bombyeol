/** 알림 종류 - 문구는 messages의 push.body.<종류>(PRIVACY §3: 고정 문구만, 이름, 본문 없음) */
export type NoticeKind = "moment" | "story" | "ask" | "heart" | "comment" | "news";

/** 기기 하나로 보내는 메시지. 데이터에는 종류, id, 링크만 싣는다(본문 없음) */
export type PushMessage = {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 여는 절대 URL */
  link: string;
  data: Record<string, string>;
};

/** ok: 전달됨, invalid_token: 지워야 할 토큰, error: 일시 오류(재시도하지 않음) */
export type SendOutcome = "ok" | "invalid_token" | "error";

export interface PushSender {
  send(token: string, message: PushMessage): Promise<SendOutcome>;
}
