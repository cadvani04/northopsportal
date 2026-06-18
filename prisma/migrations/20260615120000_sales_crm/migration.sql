-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('COLD_OUTREACH', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'COMMITTED', 'ACTIVE', 'CLOSED_LOST');
CREATE TYPE "OutreachChannel" AS ENUM ('LINKEDIN', 'EMAIL', 'CALL', 'TEXT', 'IN_PERSON', 'OTHER');
CREATE TYPE "OutreachOutcome" AS ENUM ('SENT', 'OPENED', 'REPLIED', 'NO_RESPONSE', 'MEETING_BOOKED', 'NOT_INTERESTED');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'OUTREACH_LOGGED';
ALTER TYPE "ActivityType" ADD VALUE 'STAGE_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'CONTACT_ADDED';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'DISCOVERY',
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "source" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "dealValue" DOUBLE PRECISION,
ADD COLUMN "probability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextFollowUp" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutreachTouch" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "channel" "OutreachChannel" NOT NULL,
    "subject" TEXT,
    "notes" TEXT,
    "outcome" "OutreachOutcome" NOT NULL DEFAULT 'SENT',
    "touchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUp" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachTouch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutreachTouch" ADD CONSTRAINT "OutreachTouch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill pipeline stages from legacy status strings
UPDATE "Client" SET "pipelineStage" = 'COLD_OUTREACH' WHERE "status" = 'prospect';
UPDATE "Client" SET "pipelineStage" = 'NEGOTIATION' WHERE "status" = 'prospect-advanced';
UPDATE "Client" SET "pipelineStage" = 'COMMITTED' WHERE "status" = 'committed';
UPDATE "Client" SET "pipelineStage" = 'ACTIVE' WHERE "status" IN ('active', 'implementation', 'internal', 'legacy-marketing');
UPDATE "Client" SET "pipelineStage" = 'CLOSED_LOST' WHERE "status" = 'closed-lost';
