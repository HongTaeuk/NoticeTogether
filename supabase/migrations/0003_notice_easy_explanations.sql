-- PRD 4-4: 장애 자녀 가정 조건부 "쉬운 설명" 섹션 저장용.
-- 배열 [{ "term": string, "explanation": string }], 해당 없으면 null.
alter table notices add column easy_explanations jsonb;
