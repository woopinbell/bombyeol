import "next-auth";

declare module "next-auth" {
  interface Session {
    /** 봄별 User.id */
    userId?: string;
  }
}
