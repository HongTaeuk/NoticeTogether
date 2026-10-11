// apps/web-api의 src/lib/ai/summarize.ts와 동일한 계약을 따른다.
export type ChecklistCategory = "준비물" | "제출서류" | "기한";

export type ChecklistItemDraft = {
  category: ChecklistCategory;
  title: string;
  detail: string | null;
  dueDate: string | null;
  confidence: number;
};

export type SummarizeResult = {
  summary: string;
  items: ChecklistItemDraft[];
};

// primary/secondary = 양육자(정보를 도맡는 쪽/아닌 쪽, 원칙 3의 자동 렌더링 기준), child = 아이.
export type Role = "primary" | "secondary" | "child";

export type PersistedItem = {
  id: string;
  category: ChecklistCategory;
  title: string;
  detail: string | null;
  due_date: string | null;
  ai_confidence: number;
  is_edited_by_user: boolean;
  is_done: boolean;
};

export type ItemAction = {
  id: string;
  checklist_item_id: string;
  user_id: string;
  action: "checked" | "unchecked" | "note";
  note: string | null;
  created_at: string;
};

export const CATEGORY_COLOR: Record<ChecklistCategory, string> = {
  준비물: "#13854A",
  제출서류: "#F58A1F",
  기한: "#E8503A",
};

export const CATEGORY_EMOJI: Record<ChecklistCategory, string> = {
  준비물: "🎒",
  제출서류: "📄",
  기한: "⏰",
};

// 부부만이 아니라 조부모 등 다양한 양육 환경이 있어서 "보호자 1/2" 대신 역할만 부르고, 호칭이 있으면 호칭을 쓴다.
export const ROLE_LABEL: Record<Role, string> = { primary: "양육자", secondary: "양육자", child: "아이" };

export function memberName(role: Role | string | null | undefined, displayName: string | null | undefined): string {
  if (displayName && displayName.trim()) return displayName.trim();
  return role === "child" ? "아이" : "양육자";
}
