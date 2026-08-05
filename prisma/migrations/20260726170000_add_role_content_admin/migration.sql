-- Separate transaction from ADMIN→OWNER rename so new Role labels are not mixed
-- with RENAME / data writes. This migration only registers the label; it does not
-- assign CONTENT_ADMIN to any rows.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTENT_ADMIN';
