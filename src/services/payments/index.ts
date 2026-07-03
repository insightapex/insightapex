/**
 * Payments service placeholder (legacy re-export).
 * @deprecated Use @/services/access-control and @/services/billing instead.
 */

export {
  hasPaperAccess as hasActiveAccess,
  hasPaperAccess,
  hasMockExamAccess,
  canAccessQuestion,
} from "@/services/access-control";

export { hasActiveSubscription } from "@/services/subscription";
