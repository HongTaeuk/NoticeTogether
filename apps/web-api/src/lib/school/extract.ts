import { inflateRawSync } from "node:zlib";
import CFB from "cfb";
import { strFromU8, unzipSync } from "fflate";
import { decodeEntities } from "./http";

/**
 * 가정통신문 본문은 대부분 첨부파일(HWP 63% · PDF 31% · 그림 6%)에 있다(REPORT §5.5).
 * PDF·HWPX·HWP5 글자를 외부 프로그램 없이 뽑는다. 그림뿐인 첨부는 읽지 않는다(OCR은 PRD 범위 밖).
 */
export async function extractAttachmentText(name: string, data: Uint8Array): Promise<string | null> {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  try {
    if (ext === "pdf" || isPdf(data)) return await pdfText(data);
    if (ext === "hwpx" || (ext !== "hwp" && isZip(data))) return hwpxText(data);
    if (ext === "hwp") return hwp5Text(data);
  } catch {
    return null;
  }
  return null;
}

const isPdf = (d: Uint8Array) => d[0] === 0x25 && d[1] === 0x50 && d[2] === 0x44 && d[3] === 0x46; // %PDF
const isZip = (d: Uint8Array) => d[0] === 0x50 && d[1] === 0x4b; // PK

async function pdfText(data: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(data);
  const { text } = await extractText(doc, { mergePages: true });
  return text.replace(/[ \t]+/g, " ").trim();
}

/** HWPX = ZIP + Contents/section*.xml의 `<hp:t>`. 문단(`</hp:p>`)마다 줄을 바꾼다. */
function hwpxText(data: Uint8Array): string {
  const files = unzipSync(data, { filter: (f) => /^Contents\/section\d+\.xml$/i.test(f.name) });
  const sections = Object.keys(files).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  const lines: string[] = [];
  for (const key of sections) {
    const xml = strFromU8(files[key]);
    for (const para of xml.split(/<\/hp:p>/)) {
      const runs = [...para.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
      const line = decodeEntities(runs.join("")).trim();
      if (line) lines.push(line);
    }
  }
  return lines.join("\n");
}

// HWP 5.0 = OLE 복합문서. FileHeader의 속성(오프셋 36) bit0 = 압축, bit1 = 암호.
// BodyText/SectionN을 (압축이면 raw deflate로 풀어) 레코드로 읽고, HWPTAG_PARA_TEXT(67)의 UTF-16LE 글자를 모은다.
const HWPTAG_PARA_TEXT = 67;
// 8글자(16바이트)를 차지하는 인라인·확장 제어문자. 나머지 32 미만은 1글자짜리 제어문자.
const WIDE_CONTROLS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

function hwp5Text(data: Uint8Array): string | null {
  const container = CFB.read(Buffer.from(data), { type: "buffer" });
  // cfb의 find는 하위 폴더 경로("BodyText/Section0")를 못 찾을 때가 있어 전체 경로 끝으로 직접 찾는다.
  const entry = (path: string) => {
    const i = container.FullPaths.findIndex((p) => p.toLowerCase().endsWith(`/${path.toLowerCase()}`));
    return i >= 0 ? container.FileIndex[i] : undefined;
  };
  const header = entry("FileHeader")?.content as Uint8Array | undefined;
  if (!header || header.length < 40) return null;
  const flags = header[36] | (header[37] << 8) | (header[38] << 16) | (header[39] << 24);
  if (flags & 0b10) return null; // 암호 걸린 문서
  const compressed = (flags & 0b1) === 1;

  const lines: string[] = [];
  for (let n = 0; ; n++) {
    const section = entry(`BodyText/Section${n}`);
    if (!section?.content) break;
    let buf = Buffer.from(section.content as Uint8Array);
    if (compressed) buf = inflateRawSync(buf);
    let pos = 0;
    while (pos + 4 <= buf.length) {
      const head = buf.readUInt32LE(pos);
      pos += 4;
      const tag = head & 0x3ff;
      let size = (head >>> 20) & 0xfff;
      if (size === 0xfff) {
        size = buf.readUInt32LE(pos);
        pos += 4;
      }
      if (tag === HWPTAG_PARA_TEXT) lines.push(paraText(buf.subarray(pos, pos + size)));
      pos += size;
    }
  }
  return lines.map((l) => l.trim()).filter(Boolean).join("\n");
}

function paraText(rec: Buffer): string {
  let out = "";
  for (let i = 0; i + 1 < rec.length; ) {
    const ch = rec.readUInt16LE(i);
    if (ch < 32) {
      if (ch === 10 || ch === 13) out += "\n";
      else if (ch === 9) out += "\t";
      i += WIDE_CONTROLS.has(ch) ? 16 : 2;
      continue;
    }
    out += String.fromCharCode(ch);
    i += 2;
  }
  return out;
}
