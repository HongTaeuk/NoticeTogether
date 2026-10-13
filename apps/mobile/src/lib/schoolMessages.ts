import type { SchoolStatus } from "../types/school";

/**
 * 학교 연결 상태 → 양육자에게 보여 줄 안내. 되는 것·안 되는 것·잠시 안 되는 것을 숨기지 않고
 * "지금 무엇을 하면 되는지"까지 한 번에 알려 준다(REPORT §8.3: 조용히 0건이면 "통신문이 없구나"로 읽힌다).
 */
export type SchoolSituation = { tone: "ok" | "info" | "warn"; title: string; body: string };

export function schoolSituation(status: SchoolStatus | null, opts: { offline?: boolean } = {}): SchoolSituation | null {
  if (opts.offline) {
    return { tone: "info", title: "인터넷이 연결되면 확인할게요", body: "지금은 학교 소식을 가져올 수 없어요. 연결되면 앱을 다시 열어 주세요." };
  }
  if (!status || status.needsMigration || !status.linked) return null;
  const boards = status.boards ?? [];
  const loginOnly = boards.length > 0 && boards.every((b) => !b.supported && /로그인/.test(b.error ?? ""));
  const anySupported = boards.some((b) => b.supported);
  const temporarilyDown = anySupported && boards.filter((b) => b.supported).every((b) => !!b.error);

  if (!status.school?.homepage) {
    return {
      tone: "warn",
      title: "학교 홈페이지 정보가 없어요",
      body: "교육청 학교 정보에 홈페이지 주소가 없어 자동으로 가져올 수 없어요. 받은 알림은 \"새 알림\"에 붙여넣어 주세요.",
    };
  }
  if (boards.length === 0) {
    return {
      tone: "warn",
      title: "가정통신문 게시판을 찾지 못했어요",
      body: "이 학교 홈페이지에서 가정통신문 메뉴를 아직 찾지 못했어요. 하루에 한 번 다시 찾아볼게요. 그동안 받은 알림은 붙여넣어 주세요.",
    };
  }
  if (loginOnly) {
    return {
      tone: "warn",
      title: "로그인해야 볼 수 있는 게시판이에요",
      body: "이 학교는 가정통신문을 로그인한 사람에게만 보여 줘서 자동으로 가져올 수 없어요. 받은 알림은 붙여넣어 주세요.",
    };
  }
  if (!anySupported) {
    return {
      tone: "warn",
      title: "아직 자동으로 읽지 못하는 홈페이지예요",
      body: "이 학교 홈페이지 형식은 아직 읽지 못해요. 읽을 수 있게 되면 알아서 가져올게요. 그동안 받은 알림은 붙여넣어 주세요.",
    };
  }
  if (temporarilyDown) {
    return {
      tone: "info",
      title: "학교 홈페이지가 잠시 열리지 않아요",
      body: "학교 서버가 바쁘거나 점검 중일 수 있어요. 다음에 앱을 열 때 다시 확인할게요.",
    };
  }
  return null;
}

/** 그림으로만 올라온 안내·글자가 없는 PDF 등, 알림 하나에 대한 안내. */
export function postSituation(images: number, files: number, hasText: boolean): string | null {
  if (hasText) return null;
  if (images > 0) return "학교가 이 안내를 그림으로 올렸어요. 아래 그림에서 내용을 확인해 주세요.";
  if (files > 0) return "첨부파일이 그림이나 스캔본이라 글자를 읽지 못했어요. 아래 파일을 눌러 확인해 주세요.";
  return "이 안내는 글로 올라와 있지 않아요. '학교 홈페이지에서 보기'로 확인해 주세요.";
}
