-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "model" TEXT;

-- AlterTable
ALTER TABLE "TokenUsage" ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
