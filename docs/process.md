# 작업 기록 (Process Log)

이 문서는 NoticeTogether 프로젝트에서 이루어진 모든 변경 사항을 시간순으로 기록합니다.

## 2026-09-27

- 로컬 저장소를 초기화하고 GitHub 원격 저장소(`https://github.com/HongTaeuk/NoticeTogether`)에 연결함.
- 기존 원격 `main` 브랜치(README.md만 존재)를 로컬 `main`으로 추적하도록 설정함.
- 코드 변경 시 자동으로 git에 커밋/푸시(및 필요 시 pull)하도록 hook을 설정함.
- 모든 변경 사항을 이 파일(`docs/process.md`)에 기록하도록 규칙을 정함.
- 기존 조사 자료 추가: `docs/01_research.md`, `docs/02_customer_profile.md`, `docs/제안요청서(RFP).txt.txt`, `docs/해결검토.txt.txt`.
- `.claude/settings.json`에 파일 수정(Edit/Write/NotebookEdit) 후 자동으로 git add/commit/pull/push를 수행하는 hook을 추가함.
- `README.md`를 RFP·리서치 자료를 바탕으로 프로젝트 소개, 핵심 기능, 사용 도구, 문서 링크가 담긴 형태로 재작성함.
