-- PRD 10단계(회원가입·로그인·초대 코드로 두 계정을 정식으로 하나의 가정에 묶기) /
-- docs/05_tech_review.md 292행에서 이미 계획된 households.invite_code 필드를 추가한다.

alter table households add column if not exists invite_code text;

-- 기존에 만들어진 가구(개발용 가구 포함)에도 코드를 채워 넣는다.
update households
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where invite_code is null;

alter table households alter column invite_code set not null;
alter table households add constraint households_invite_code_key unique (invite_code);
