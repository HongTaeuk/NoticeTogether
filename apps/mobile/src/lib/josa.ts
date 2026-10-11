type JosaPair = "이/가" | "을/를" | "은/는" | "와/과" | "으로/로";

/**
 * 이름 뒤 조사를 받침에 맞게 붙인다("엄마(이)가" 대신 "엄마가", "민준을").
 * 아이가 읽는 화면이라 괄호 표기가 어색하게 읽히지 않도록 한다. 한글이 아닌 글자로 끝나면 받침 없음으로 본다.
 */
export function josa(word: string, pair: JosaPair): string {
  const trimmed = word.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const final = isHangul ? (code - 0xac00) % 28 : 0;
  const [withFinal, withoutFinal] = pair.split("/");
  // "으로/로"는 ㄹ 받침(8)일 때도 "로"를 쓴다.
  const useWithFinal = pair === "으로/로" ? final !== 0 && final !== 8 : final !== 0;
  return trimmed + (useWithFinal ? withFinal : withoutFinal);
}
