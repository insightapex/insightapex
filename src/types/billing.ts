export type BillingAccessType =
  | "FREE"
  | "MONTHLY_SUBSCRIPTION"
  | "YEARLY_SUBSCRIPTION"
  | "ONE_TIME_PAPER"
  | "ONE_TIME_MOCK_EXAM"
  | "ADMIN_GRANTED";

export type MockExamStatus = "DRAFT" | "PUBLISHED";

export interface PlanSummary {
  id: string;
  name: string;
  slug: string;
  accessType: BillingAccessType;
  priceCents: number;
  currency: string;
  billingInterval: "MONTHLY" | "YEARLY" | "ONE_TIME";
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  accessType: BillingAccessType;
  isPremium: boolean;
  priceCents: number | null;
}

export interface MockExamSummary {
  id: string;
  title: string;
  description: string | null;
  paperCode: string;
  paperTitle: string;
  questionCount: number;
  durationMinutes: number;
  passMarkPercent: number;
  status: MockExamStatus;
  isActive: boolean;
  accessLevel: "FREE" | "PREMIUM";
  isPremium: boolean;
}
