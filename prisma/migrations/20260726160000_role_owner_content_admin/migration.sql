-- Promote legacy Role label ADMIN → OWNER without ADD VALUE + write in the same
-- transaction (Postgres error 55P04: new enum values cannot be used until commit).
-- RENAME VALUE rewrites the existing label in place and is safe immediately.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'OWNER'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'OWNER';
  END IF;
END $$;

-- Intentionally no UPDATE/CAST to OWNER and no ADD VALUE 'OWNER' here.
-- CONTENT_ADMIN is added in the next migration (own transaction).
