-- NoticeTogether 초기 스키마
-- 근거: docs/06_prd.md, docs/05_tech_review.md (가구 단위 RLS, Pull 기반 동기화,
-- 원문 영구 보존, append-only 액션/이벤트 로그, 아동 정보 별도 동의)

create extension if not exists "pgcrypto";

-- 가구(household) 단위로 보호자 2명 이상이 묶인다.
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  role text not null check (role in ('primary', 'secondary')),
  display_name text,
  created_at timestamptz not null default now()
);

-- 자녀 정보: 만 나이 추정용 출생연도만 저장(생년월일 전체 저장 안 함), 장애 유형은 별도 동의 필요
create table children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  birth_year int,
  disability_type text,
  created_at timestamptz not null default now()
);

-- 알림/가정통신문. 원문(raw_text)은 항상 보존 (원문 비교 토글, AI 장애 대비)
create table notices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  raw_text text not null,
  ai_summary text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  category text not null check (category in ('준비물', '제출서류', '기한')),
  title text not null,
  detail text,
  due_date date,
  ai_confidence numeric(3, 2),
  is_edited_by_user boolean not null default false,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 보호자별 액션 기록(append-only). "누가 안 했는지"가 아니라 "각자 무엇을 했는지"를 보여주기 위함.
create table item_actions (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  user_id uuid not null references users(id),
  action text not null, -- 예: 'checked', 'unchecked', 'note'
  note text,
  created_at timestamptz not null default now()
);

-- 조회/열람 이벤트 로그(append-only). notice_opened -> item_checked -> partner_view_confirmed 순서가
-- 성공 지표(북극성 지표)이므로 분석을 위해 원본 이벤트를 그대로 쌓아둔다.
create table notice_events (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  user_id uuid not null references users(id),
  event_type text not null check (
    event_type in ('notice_opened', 'partner_view_confirmed', 'source_compared')
  ),
  created_at timestamptz not null default now()
);

-- 동의 기록(append-only). 아동 정보 저장 전 만 14세 미만 보호자 동의 필요(FR-5).
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  consent_type text not null check (
    consent_type in ('child_info', 'disability_info', 'ai_processing')
  ),
  granted boolean not null,
  created_at timestamptz not null default now()
);

-- AI 요약 호출 로그. 모델/프롬프트 버전을 남겨 벤더 교체(NVIDIA NIM -> Gemini/Groq 등) 시 추적 가능하게 함.
create table ai_summary_logs (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  model_used text not null,
  prompt_version text not null,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- RLS: 모든 테이블은 household_id(또는 그것으로 연결되는 FK)를 통해
-- "내 가구 데이터만 보인다"를 강제한다. 정책은 이후 마이그레이션에서 세분화한다.
alter table households enable row level security;
alter table users enable row level security;
alter table children enable row level security;
alter table notices enable row level security;
alter table checklist_items enable row level security;
alter table item_actions enable row level security;
alter table notice_events enable row level security;
alter table consents enable row level security;
alter table ai_summary_logs enable row level security;
