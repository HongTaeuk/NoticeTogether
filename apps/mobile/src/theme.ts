/**
 * 아이도 함께 쓰는 앱이라 사무적인 파랑 대신 초록·노랑 중심의 밝은 팔레트를 쓴다
 * (초등학생용 학습 앱처럼 친근하게). 회색은 쓰지 않는다 — 보조 색은 따뜻한 갈색 계열.
 */
export const COLORS = {
  primary: "#13854A", // 버튼·링크·활성 탭 (흰 글자 대비 4.7:1)
  primarySoft: "#A6D9B8", // 비활성 버튼·플레이스홀더
  primaryFaint: "#8FC9A5",
  sun: "#FFD54A", // 강조 노랑 (헤더 띠·별·뱃지)
  sunSoft: "#FFF4C7",
  sunInk: "#6B4E00", // 노랑 위 글자
  ink: "#3A2E1F", // 본문 글자 (따뜻한 진갈색)
  muted: "#7A5F33", // 보조 글자
  line: "#CFE8D6",
  tint: "#F1FAF3",
  bg: "#FFFFFF",
  cream: "#FFFCF2",
  red: "#E8503A",
  orange: "#F58A1F",
  orangeSoft: "#FFF3E6",
  orangeInk: "#B85C00",
  wood: "#F2D9A8", // 내 방 바닥
  sky: "#E3F3FF",
  skyInk: "#1F6FA8",
  white: "#FFFFFF",
} as const;

/** 제목·버튼처럼 눈에 띄어야 하는 곳에만 쓰는 둥근 글꼴. 굵기는 글꼴 자체에 있으니 fontWeight를 함께 주지 않는다. */
export const FONT_DISPLAY = "Jua-Regular";
