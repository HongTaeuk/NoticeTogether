import { NextResponse } from "next/server";
import type { ResolvedUser } from "@/lib/auth/session";

export type MemberRole = "primary" | "secondary" | "child";

/**
 * 양육 환경은 부부만이 아니다(조부모·한부모 등). 그래서 "보호자 1/2"·"배우자" 대신
 * 각자 정한 호칭(엄마·할머니 등)을 쓰고, 없으면 "양육자"/"아이"로 부른다.
 */
export function memberLabel(role: string | null | undefined, displayName: string | null | undefined): string {
  if (displayName && displayName.trim()) return displayName.trim();
  return role === "child" ? "아이" : "양육자";
}

/** 알림 등록·항목 수정·자녀 정보·동의는 양육자만 한다. 아이 계정이면 403 응답을, 아니면 null을 돌려준다. */
export function forbidChild(resolved: ResolvedUser): NextResponse | null {
  if (resolved.role !== "child") return null;
  return NextResponse.json({ error: "아이 계정에서는 할 수 없어요. 양육자에게 부탁해 주세요." }, { status: 403 });
}

/**
 * 0004 마이그레이션(아이 역할·가족 이야기)을 아직 실행하지 않은 DB에서 나는 에러인지.
 * 이 경우 앱 전체가 멈추지 않게 해당 기능만 안내 문구로 비켜간다.
 */
export function isMissingMigrationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    code === "PGRST205" || // PostgREST: 테이블이 스키마 캐시에 없음
    code === "PGRST204" || // PostgREST: 컬럼이 스키마 캐시에 없음
    (code === "23514" && message.includes("users_role_check")) ||
    message.includes("schema cache")
  );
}

export const MIGRATION_REQUIRED_MESSAGE =
  "이 기능을 쓰려면 DB 업데이트(0004)가 필요해요. 관리자에게 알려주세요.";
