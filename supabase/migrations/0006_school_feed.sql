-- 0006: 학교 가정통신문 자동 수집 (research/REPORT.md 기반, docs/06_prd.md 2026-10-13 갱신 노트)
--
-- 흐름: 가정이 학교를 고른다(household_schools) → 서버가 학교 홈페이지에서 가정통신문 게시판을 찾는다(school_boards)
--     → 게시판 새 글을 모은다(school_posts, 학교 단위로 한 번만 받아 AI 요약까지 저장)
--     → 그 학교를 고른 가정마다 알림(notices.source_post_id)으로 넣는다.
-- 게시판·글은 공개 홈페이지의 것이라 가정과 무관하게 학교 단위로 공유하고, 가정별 데이터는 notices에만 남는다.

create table if not exists household_schools (
  household_id uuid primary key references households(id) on delete cascade,
  atpt_code text not null,          -- NEIS 시도교육청 코드 (ATPT_OFCDC_SC_CODE)
  atpt_name text,
  school_code text not null,        -- NEIS 표준학교코드 (SD_SCHUL_CODE)
  school_name text not null,
  homepage text,
  grade int check (grade between 1 and 6),  -- 선택: 학년이 적힌 글 거르기에만 쓴다
  linked_at timestamptz not null default now(),
  boards_checked_at timestamptz             -- 게시판 찾기를 마지막으로 시도한 때
);

create table if not exists school_boards (
  id uuid primary key default gen_random_uuid(),
  school_code text not null,
  kind text not null check (kind in ('notice', 'office_notice', 'weekly')), -- 가정통신문 / 가정통신문(교육청) / 주간학습안내
  label text not null,               -- 홈페이지 메뉴 이름 그대로
  family text not null,              -- 홈페이지 형식(어댑터): 'na_ntt' | 'sen_dggb'
  list_url text not null,
  params jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (school_code, list_url)
);
create index if not exists school_boards_school on school_boards(school_code);

create table if not exists school_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references school_boards(id) on delete cascade,
  school_code text not null,
  post_key text not null,            -- 게시판 글 ID(nttSn, nttId 등)
  title text not null,
  posted_on date,
  url text not null,                 -- 학부모가 열어 볼 원문 주소
  body_text text,
  attachments jsonb not null default '[]'::jsonb,  -- [{name, url, size, chars}]
  ai_summary text,
  ai_items jsonb,
  status text not null default 'listed' check (status in ('listed', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (board_id, post_key)
);
create index if not exists school_posts_school_date on school_posts(school_code, posted_on desc);

alter table notices add column if not exists source_post_id uuid references school_posts(id) on delete set null;
create unique index if not exists notices_household_source_post
  on notices(household_id, source_post_id) where source_post_id is not null;

alter table household_schools enable row level security;
alter table school_boards enable row level security;
alter table school_posts enable row level security;
