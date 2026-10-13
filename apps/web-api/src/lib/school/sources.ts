import type { SupabaseClient } from "@supabase/supabase-js";

export type NoticeSource = {
  title: string;
  url: string;
  postedOn: string | null;
  boardLabel: string | null;
  /** 본문에 붙은 그림 주소 — 그림으로만 올린 가정통신문을 앱 안에서 바로 보여 준다. */
  images: string[];
  /** 첨부파일(이름·주소) — 앱에서 원본 파일을 열 수 있게. */
  files: { name: string; url: string }[];
};

type StoredAttachment = { kind?: string; name?: string; url?: string };

/**
 * 학교 홈페이지에서 가져온 알림이면 그 원문 글 정보(제목·주소·게시일·게시판 이름·그림·첨부).
 * 0006 마이그레이션 전이거나 조회가 실패하면 조용히 빈 결과 — 알림 목록·상세 자체를 막지 않는다.
 */
export async function loadNoticeSources(db: SupabaseClient, noticeIds: string[], withMedia = false): Promise<Map<string, NoticeSource>> {
  const out = new Map<string, NoticeSource>();
  if (noticeIds.length === 0) return out;
  const { data, error } = await db
    .from("notices")
    .select(`id, source_post_id, school_posts(title, url, posted_on, ${withMedia ? "attachments, " : ""}school_boards(label))`)
    .in("id", noticeIds)
    .not("source_post_id", "is", null);
  if (error || !data) return out;
  for (const row of data) {
    const post = row.school_posts as unknown as {
      title: string;
      url: string;
      posted_on: string | null;
      attachments?: StoredAttachment[];
      school_boards: { label: string } | null;
    } | null;
    if (!post) continue;
    const atts = Array.isArray(post.attachments) ? post.attachments : [];
    out.set(row.id as string, {
      title: post.title,
      url: post.url,
      postedOn: post.posted_on,
      boardLabel: post.school_boards?.label ?? null,
      images: atts.filter((a) => a.kind === "image" && a.url).map((a) => a.url as string),
      files: atts.filter((a) => a.kind !== "image" && a.url && a.name).map((a) => ({ name: a.name as string, url: a.url as string })),
    });
  }
  return out;
}
