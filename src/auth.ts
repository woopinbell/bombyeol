import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

// S-2 스파이크: DB 어댑터 없이 JWT 세션. 자격증명은 AUTH_<PROVIDER>_ID/SECRET, AUTH_SECRET에서 자동으로 읽는다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao, Google],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    jwt({ token, account }) {
      if (account) token.provider = account.provider;
      return token;
    },
    session({ session, token }) {
      return { ...session, provider: token.provider, userId: token.sub };
    },
  },
});
