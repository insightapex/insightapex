-- Restore global subscription UserAccess for active subscriptions
UPDATE "UserAccess" ua
SET "endsAt" = NULL, "status" = 'ACTIVE'
FROM "Subscription" s
WHERE ua."subscriptionId" = s.id
  AND s.status IN ('ACTIVE', 'TRIALING')
  AND ua."paperId" IS NULL
  AND ua."mockExamId" IS NULL;
