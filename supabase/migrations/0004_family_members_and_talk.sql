-- 0004: 아이도 가족 구성원으로 연결 + 가족 이야기(대화·공유)
-- Supabase 대시보드 > SQL Editor에서 이 파일 전체를 붙여넣고 Run 하면 된다. 여러 번 실행해도 안전하다.

-- 1) 구성원 역할에 'child'(아이)를 추가한다. 양육자는 기존대로 primary/secondary.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('primary', 'secondary', 'child'));

-- 2) 아이 계정이 어떤 자녀 정보(children)와 연결되는지. 동의 절차를 거쳐 등록된 자녀만 연결된다.
alter table users add column if not exists child_id uuid references children(id) on delete set null;

-- 3) 가족 이야기: 아이와 양육자가 알림 결과를 두고 대화하고, 양육자가 아이를 위해 한 일을 공유한다.
--    kind: message(일반 대화) / share(아이를 위해 한 일 공유) / sticker(칭찬 스티커)
create table if not exists family_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  notice_id uuid references notices(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'share', 'sticker')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists family_messages_household_created_idx
  on family_messages (household_id, created_at desc);

alter table family_messages enable row level security;
