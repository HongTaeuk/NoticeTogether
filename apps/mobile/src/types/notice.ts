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

export type Role = "primary" | "secondary";

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
  준비물: "#1B64F2", // blue
  제출서류: "#F2871B", // orange
  기한: "#F23B3B", // red
};

export const ROLE_LABEL: Record<Role, string> = { primary: "보호자 1", secondary: "보호자 2" };
