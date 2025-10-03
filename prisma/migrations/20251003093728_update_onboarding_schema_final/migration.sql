/*
  Warnings:

  - The values [SOLO,MICRO,SMALL,MEDIUM,LARGE] on the enum `OrganizationSize` will be removed. If these variants are still used in the database, this will fail.
  - The values [SME,ACADEMIC,HEALTHCARE] on the enum `OrganizationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `position` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orgSize` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."GrantSizeRange" AS ENUM ('UNDER_10K', 'TEN_TO_50K', 'FIFTY_TO_100K', 'HUNDRED_TO_500K', 'FIVE_HUNDRED_K_TO_1M', 'OVER_1M');

-- CreateEnum
CREATE TYPE "public"."Industry" AS ENUM ('HEALTHCARE', 'PUBLIC_HEALTH', 'EDUCATION', 'AGRICULTURE', 'ENVIRONMENT', 'TECHNOLOGY', 'CLIMATE', 'SUPPLY_CHAIN', 'HUMANITARIAN', 'GENDER');

-- CreateEnum
CREATE TYPE "public"."FundingNeed" AS ENUM ('CAPACITY_BUILDING', 'RESEARCH', 'PROJECT_IMPLEMENTATION', 'EQUIPMENT', 'TRAINING');

-- CreateEnum
CREATE TYPE "public"."FunderType" AS ENUM ('PRIVATE_FOUNDATION', 'GOVERNMENT', 'NGO', 'CORPORATE');

-- CreateEnum
CREATE TYPE "public"."GrantMatchStatus" AS ENUM ('SAVED', 'APPLIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "public"."ScrapedSourceType" AS ENUM ('GOV', 'FOUNDATION', 'BUSINESS', 'NGO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ScrapingFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."ScrapedSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('POLAR', 'DODOPAYMENTS');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."AITaskType" AS ENUM ('PROPOSAL_GENERATION', 'EDITING', 'SUMMARIZATION');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."OrganizationSize_new" AS ENUM ('SOLO_1', 'MICRO_2_10', 'SMALL_11_50', 'MEDIUM_51_250', 'LARGE_250_PLUS');
ALTER TABLE "public"."organizations" ALTER COLUMN "orgSize" TYPE "public"."OrganizationSize_new" USING ("orgSize"::text::"public"."OrganizationSize_new");
ALTER TYPE "public"."OrganizationSize" RENAME TO "OrganizationSize_old";
ALTER TYPE "public"."OrganizationSize_new" RENAME TO "OrganizationSize";
DROP TYPE "public"."OrganizationSize_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."OrganizationType_new" AS ENUM ('BUSINESS', 'NONPROFIT', 'GOVERNMENT', 'SOCIAL_ENTERPRISE', 'RESEARCH_ACADEMIC', 'OTHER');
ALTER TABLE "public"."organizations" ALTER COLUMN "orgType" TYPE "public"."OrganizationType_new" USING ("orgType"::text::"public"."OrganizationType_new");
ALTER TYPE "public"."OrganizationType" RENAME TO "OrganizationType_old";
ALTER TYPE "public"."OrganizationType_new" RENAME TO "OrganizationType";
DROP TYPE "public"."OrganizationType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "public"."accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."organizations" DROP CONSTRAINT "organizations_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_preferences" DROP CONSTRAINT "user_preferences_userId_fkey";

-- AlterTable
ALTER TABLE "public"."organizations" DROP COLUMN "position",
DROP COLUMN "region",
DROP COLUMN "size",
ADD COLUMN     "fundingNeeds" "public"."FundingNeed"[],
ADD COLUMN     "grantSizeRange" "public"."GrantSizeRange",
ADD COLUMN     "industries" "public"."Industry"[],
ADD COLUMN     "orgSize" "public"."OrganizationSize" NOT NULL;

-- DropTable
DROP TABLE "public"."accounts";

-- DropTable
DROP TABLE "public"."sessions";

-- DropTable
DROP TABLE "public"."users";

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'SEEKER',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "loginAttempts" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FunderType" NOT NULL,
    "website" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grants" (
    "id" TEXT NOT NULL,
    "funderId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eligibilityCriteria" TEXT,
    "deadline" TIMESTAMP(3),
    "fundingAmountMin" DECIMAL(65,30),
    "fundingAmountMax" DECIMAL(65,30),
    "source" TEXT,
    "category" "public"."GrantCategory" NOT NULL,
    "scrapedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grant_matches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "matchScore" INTEGER DEFAULT 0,
    "status" "public"."GrantMatchStatus" NOT NULL DEFAULT 'SAVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grant_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "proposalText" TEXT,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "resultDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scraped_sources" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "public"."ScrapedSourceType" NOT NULL,
    "lastScrapedAt" TIMESTAMP(3),
    "frequency" "public"."ScrapingFrequency" NOT NULL DEFAULT 'WEEKLY',
    "status" "public"."ScrapedSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraped_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider" "public"."PaymentProvider" NOT NULL,
    "subscriptionPlan" "public"."SubscriptionPlan" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PAID',
    "lastPaymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" "public"."AITaskType" NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "costUsd" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "public"."account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "public"."verification"("identifier", "value");

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grants" ADD CONSTRAINT "grants_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "public"."funders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grant_matches" ADD CONSTRAINT "grant_matches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grant_matches" ADD CONSTRAINT "grant_matches_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "public"."grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "public"."grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
