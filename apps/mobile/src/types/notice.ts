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
