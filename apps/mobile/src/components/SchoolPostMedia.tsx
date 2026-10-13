import React, { useEffect, useState } from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT_DISPLAY } from "../theme";

/**
 * 학교가 가정통신문을 그림으로만 올린 경우(본문에 이미지 몇 장) 학교 홈페이지로 보내지 않고 앱 안에서 바로 보여 준다.
 * 그림은 학교 서버에서 직접 받는다(우리 서버에 복사하지 않음). 원본 크기 비율대로 화면 폭에 맞추고, 누르면 크게 연다.
 */
function SchoolImage({ uri, referer }: { uri: string; referer: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const headers = { Referer: referer };
  useEffect(() => {
    Image.getSizeWithHeaders(
      uri,
      headers,
      (w, h) => setRatio(w > 0 && h > 0 ? w / h : 0.7),
      () => setFailed(true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);
  if (failed) {
    return (
      <TouchableOpacity style={styles.failBox} onPress={() => Linking.openURL(uri).catch(() => {})}>
        <Text style={styles.failText}>그림을 불러오지 못했어요 · 눌러서 열기</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(uri).catch(() => {})}>
      <Image
        source={{ uri, headers }}
        style={[styles.image, { aspectRatio: ratio ?? 0.7 }]}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </TouchableOpacity>
  );
}

export default function SchoolPostMedia({
  images,
  files,
  pageUrl,
  note,
}: {
  images: string[];
  files: { name: string; url: string }[];
  pageUrl: string;
  note?: string | null;
}) {
  if (images.length === 0 && files.length === 0) return null;
  const referer = (() => {
    try {
      return new URL(pageUrl).origin + "/";
    } catch {
      return pageUrl;
    }
  })();
  return (
    <View style={styles.box}>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {images.length > 0 && (
        <>
          <Text style={styles.heading}>🖼️ 학교에서 올린 그림 {images.length}장</Text>
          {images.map((u) => (
            <SchoolImage key={u} uri={u} referer={referer} />
          ))}
        </>
      )}
      {files.length > 0 && (
        <>
          <Text style={styles.heading}>📎 첨부파일</Text>
          {files.map((f) => (
            <TouchableOpacity key={f.url} style={styles.fileRow} onPress={() => Linking.openURL(f.url).catch(() => {})}>
              <Text style={styles.fileName} numberOfLines={2}>
                {f.name}
              </Text>
              <Text style={styles.fileOpen}>열기 ›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 12, gap: 8 },
  note: { fontSize: 13, lineHeight: 19, color: COLORS.orangeInk, backgroundColor: COLORS.orangeSoft, borderRadius: 12, padding: 10 },
  heading: { fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.ink, marginTop: 4 },
  image: { width: "100%", borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  failBox: { borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, alignItems: "center", backgroundColor: COLORS.white },
  failText: { fontSize: 13, color: COLORS.muted, fontWeight: "700" },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileName: { flex: 1, fontSize: 14, color: COLORS.ink },
  fileOpen: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
});
