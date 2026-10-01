import { auth, signIn, signOut } from "@/auth";

// S-2 스파이크 확인 화면(디자인 아님)
export default async function Home() {
  const session = await auth();
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.8 }}>
      <h1>봄별 S-2 로그인 스파이크</h1>
      {session?.user ? (
        <>
          <p>로그인됨: {session.user.name ?? "(이름 없음)"}</p>
          <p>
            <a href="/api/trpc/me">보호된 tRPC 호출(/api/trpc/me) 열기</a>
          </p>
          <form action={async () => { "use server"; await signOut(); }}>
            <button type="submit">로그아웃</button>
          </form>
        </>
      ) : (
        <>
          <form action={async () => { "use server"; await signIn("kakao"); }}>
            <button type="submit">카카오로 로그인</button>
          </form>
          <form action={async () => { "use server"; await signIn("google"); }}>
            <button type="submit">Google로 로그인</button>
          </form>
        </>
      )}
    </main>
  );
}
