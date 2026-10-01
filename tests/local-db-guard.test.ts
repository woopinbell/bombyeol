import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrl } from "../scripts/with-local-db.mjs";

describe("로컬 DB 가드", () => {
  it("로컬 호스트는 통과한다", () => {
    for (const host of ["localhost", "127.0.0.1", "postgres"]) {
      const url = `postgresql://postgres:postgres@${host}:5432/bombyeol`;
      expect(assertLocalDatabaseUrl(url)).toBe(url);
    }
  });

  it("원격 호스트는 거부한다", () => {
    expect(() =>
      assertLocalDatabaseUrl("postgresql://u:p@db.abcdef.supabase.co:5432/postgres"),
    ).toThrow();
    expect(() =>
      assertLocalDatabaseUrl("postgresql://u:p@aws-0-ap-northeast-2.pooler.supabase.com:5432/x"),
    ).toThrow();
  });

  it("형식이 잘못된 URL은 거부한다", () => {
    expect(() => assertLocalDatabaseUrl("not a url")).toThrow();
  });
});
