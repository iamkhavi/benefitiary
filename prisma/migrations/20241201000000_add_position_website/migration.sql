-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "UserPosition" AS ENUM ('CEO', 'FOUNDER', 'PROGRAM_MANAGER', 'DEVELOPMENT_MANAGER', 'GRANT_WRITER', 'OPERATIONS_MANAGER', 'PROJECT_COORDINATOR', 'RESEARCH_DIRECTOR', 'FINANCE_MANAGER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add position and website columns to organizations table (if not exists)
DO $$ BEGIN
    ALTER TABLE "organizations" ADD COLUMN "position" "UserPosition";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "organizations" ADD COLUMN "website" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Set default values for existing records
UPDATE "organizations" SET "position" = 'OTHER' WHERE "position" IS NULL;

-- Make position NOT NULL after setting defaults
ALTER TABLE "organizations" ALTER COLUMN "position" SET NOT NULL;