import type { SupabaseClient } from "@supabase/supabase-js";

export type NoticeSource = { title: string; url: string; postedOn: string | null; boardLabel: string | null };

/**
 * 학교 홈페이지에서 가져온 알림이면 그 원문 글 정보(제목·주소·게시일·게시판 이름).
 * 0006 마이그레이션 전이거나 조회가 실패하면 조용히 빈 결과 — 알림 목록·상세 자체를 막지 않는다.
 */
export async function loadNoticeSources(db: SupabaseClient, noticeIds: string[]): Promise<Map<string, NoticeSource>> {
  const out = new Map<string, NoticeSource>();
  if (noticeIds.length === 0) return out;
  const { data, error } = await db
    .from("notices")
    .select("id, source_post_id, school_posts(title, url, posted_on, school_boards(label))")
    .in("id", noticeIds)
    .not("source_post_id", "is", null);
  if (error || !data) return out;
  for (const row of data) {
    const post = row.school_posts as unknown as { title: string; url: string; posted_on: string | null; school_boards: { label: string } | null } | null;
    if (!post) continue;
    out.set(row.id as string, { title: post.title, url: post.url, postedOn: post.posted_on, boardLabel: post.school_boards?.label ?? null });
  }
  return out;
}
