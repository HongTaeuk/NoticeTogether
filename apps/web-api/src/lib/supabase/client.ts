import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 서버(API 라우트) 전용 Supabase 클라이언트. service_role 키를 사용하므로
 * 절대 클라이언트(모바일 앱)로 노출하면 안 된다. RLS를 우회하는 대신
 * 라우트 핸들러에서 household_id 등 접근 범위를 직접 검증해야 한다.
 */
export function getSupabaseServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. .env.local을 확인하세요.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
