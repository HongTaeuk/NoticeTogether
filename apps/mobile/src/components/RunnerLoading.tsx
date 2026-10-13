import React from "react";
import FunLoading from "./FunLoading";

/** 운동회 달리기 로딩 — 오래 걸리는 학교 소식 가져오기용. 장면들은 FunLoading에 모여 있다. */
export default function RunnerLoading(props: {
  steps?: string[];
  sub?: string | null;
  compact?: boolean;
  done?: boolean;
  expectedMs?: number;
  progress?: number;
}) {
  return <FunLoading scene="run" {...props} />;
}
