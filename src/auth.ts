import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { createPrisma } from "@/server/db";
import { findOrCreateUser } from "@/server/auth/users";

// JWT 세션(DB 어댑터 없음, S-2). 자격증명은 AUTH_SECRET·AUTH_<PROVIDER>_ID/SECRET에서 읽는다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        const found = await findOrCreateUser(createPrisma(), {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          name: user?.name,
        });
        if (found.deletedAt) return null;
        token.uid = found.id;
      }
      // 최소 수집: 이메일·프로필 사진은 토큰에 남기지 않는다.
      delete token.email;
      delete token.picture;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.userId = token.uid;
      return session;
    },
  },
});
