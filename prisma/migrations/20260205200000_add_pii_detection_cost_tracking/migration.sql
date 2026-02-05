-- CreateTable
CREATE TABLE "PiiDetectionCost" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "conversationId" TEXT,
    "date" DATE NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PiiDetectionCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PiiDetectionCost_userId_idx" ON "PiiDetectionCost"("userId");

-- CreateIndex
CREATE INDEX "PiiDetectionCost_conversationId_idx" ON "PiiDetectionCost"("conversationId");

-- CreateIndex
CREATE INDEX "PiiDetectionCost_date_idx" ON "PiiDetectionCost"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PiiDetectionCost_userId_conversationId_date_key" ON "PiiDetectionCost"("userId", "conversationId", "date");

-- AddForeignKey
ALTER TABLE "PiiDetectionCost" ADD CONSTRAINT "PiiDetectionCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiiDetectionCost" ADD CONSTRAINT "PiiDetectionCost_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
