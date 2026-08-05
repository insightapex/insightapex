export type SearchResultType = "part" | "paper" | "category" | "subcategory";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  label: string;
  meta: string;
  href: string;
}
