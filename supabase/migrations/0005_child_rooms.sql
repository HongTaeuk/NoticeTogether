-- 0005: 아이의 "내 방" 상태 저장 (moa 마이룸 구조 이식)
-- Supabase 대시보드 > SQL Editor에서 이 파일 전체를 붙여넣고 Run 하면 된다. 여러 번 실행해도 안전하다.
--
-- 모은 물건 자체는 저장하지 않는다 — "챙긴 날"(아이가 체크한 날)에서 매번 같은 결과로 다시 계산된다.
-- 여기에는 아이가 고른 것만 남긴다: 별로 산 것, 쓴 별, 고른 털색·러그·벽지·바닥, 치워 둔 물건,
-- 마지막으로 본 도착 연출 날짜.
create table if not exists child_rooms (
  user_id uuid primary key references users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table child_rooms enable row level security;
