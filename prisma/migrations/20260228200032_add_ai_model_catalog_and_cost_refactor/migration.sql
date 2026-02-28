-- Migration: add_ai_model_catalog_and_cost_refactor
-- Adds AiModel catalog, converts costs to micro-USD integers,
-- adds message position ordering, soft deletes, and MessageRole enum.

-- 1. Create enums
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "ModelTier" AS ENUM ('free', 'standard', 'premium');
CREATE TYPE "ModelDeveloper" AS ENUM ('openai', 'anthropic', 'google', 'meta', 'deepseek', 'mistral');
CREATE TYPE "ModelProvider" AS ENUM ('openrouter', 'openai', 'anthropic', 'google', 'meta', 'deepseek', 'mistral');

-- 2. Create AiModel table
CREATE TABLE "AiModel" (
    "id"               TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "developer"        "ModelDeveloper" NOT NULL,
    "provider"         "ModelProvider" NOT NULL,
    "descriptionShort" TEXT,
    "descriptionLong"  TEXT,
    "throughput"       INTEGER,
    "latency"          INTEGER,
    "contextWindow"    INTEGER NOT NULL,
    "inputCostPer1M"   INTEGER NOT NULL,
    "outputCostPer1M"  INTEGER NOT NULL,
    "tier"             "ModelTier" NOT NULL,
    "archived"         BOOLEAN NOT NULL DEFAULT false,
    "enabled"          BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"        INTEGER NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiModel_enabled_archived_idx" ON "AiModel"("enabled", "archived");

-- 3. Seed AiModel (costs = USD * 1_000_000 = micro-USD)
INSERT INTO "AiModel" ("id", "name", "developer", "provider", "descriptionShort", "contextWindow", "inputCostPer1M", "outputCostPer1M", "tier", "sortOrder", "enabled", "archived") VALUES
    ('openai/gpt-4o-mini',              'GPT-4o Mini',        'openai',    'openrouter', 'Fast and affordable for everyday tasks',            128000,   150000,    600000, 'free',     1, true, false),
    ('openai/gpt-4o',                   'GPT-4o',             'openai',    'openrouter', 'Powerful multimodal model for complex tasks',        128000,  2500000,  10000000, 'standard', 2, true, false),
    ('anthropic/claude-sonnet-4',       'Claude Sonnet 4',    'anthropic', 'openrouter', 'Excellent reasoning and coding abilities',           200000,  3000000,  15000000, 'standard', 3, true, false),
    ('anthropic/claude-3.5-haiku',      'Claude 3.5 Haiku',   'anthropic', 'openrouter', 'Fast and compact for quick responses',              200000,   800000,   4000000, 'free',     4, true, false),
    ('google/gemini-2.0-flash-001',     'Gemini 2.0 Flash',   'google',    'openrouter', 'Lightning-fast with long context support',         1000000,   100000,    400000, 'free',     5, true, false),
    ('meta-llama/llama-3.3-70b-instruct','Llama 3.3 70B',     'meta',      'openrouter', 'Open-source powerhouse for diverse tasks',          131072,   390000,    390000, 'free',     6, true, false),
    ('deepseek/deepseek-r1',            'DeepSeek R1',        'deepseek',  'openrouter', 'Advanced reasoning with chain-of-thought',           64000,   550000,   2190000, 'standard', 7, true, false),
    ('mistralai/mistral-large',         'Mistral Large',      'mistral',   'openrouter', 'Strong multilingual and coding model',              128000,  2000000,   6000000, 'standard', 8, true, false);

-- 4. Create ModelCapability table
CREATE TABLE "ModelCapability" (
    "id"   TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "ModelCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModelCapability_name_key" ON "ModelCapability"("name");

-- Seed capabilities
INSERT INTO "ModelCapability" ("id", "name") VALUES
    ('reasoning',    'reasoning'),
    ('vision',       'vision'),
    ('tools',        'tools'),
    ('code',         'code'),
    ('long-context', 'long-context');

-- 5. Create AiModel <-> ModelCapability join table
CREATE TABLE "_AiModelToModelCapability" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AiModelToModelCapability_AB_unique" UNIQUE ("A", "B")
);

CREATE INDEX "_AiModelToModelCapability_B_index" ON "_AiModelToModelCapability"("B");

ALTER TABLE "_AiModelToModelCapability"
    ADD CONSTRAINT "_AiModelToModelCapability_A_fkey" FOREIGN KEY ("A") REFERENCES "AiModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AiModelToModelCapability"
    ADD CONSTRAINT "_AiModelToModelCapability_B_fkey" FOREIGN KEY ("B") REFERENCES "ModelCapability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed capability associations
-- openai/gpt-4o-mini: vision, tools, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('openai/gpt-4o-mini', 'vision'),
    ('openai/gpt-4o-mini', 'tools'),
    ('openai/gpt-4o-mini', 'code');

-- openai/gpt-4o: reasoning, vision, tools, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('openai/gpt-4o', 'reasoning'),
    ('openai/gpt-4o', 'vision'),
    ('openai/gpt-4o', 'tools'),
    ('openai/gpt-4o', 'code');

-- anthropic/claude-sonnet-4: reasoning, vision, tools, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('anthropic/claude-sonnet-4', 'reasoning'),
    ('anthropic/claude-sonnet-4', 'vision'),
    ('anthropic/claude-sonnet-4', 'tools'),
    ('anthropic/claude-sonnet-4', 'code');

-- anthropic/claude-3.5-haiku: vision, tools, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('anthropic/claude-3.5-haiku', 'vision'),
    ('anthropic/claude-3.5-haiku', 'tools'),
    ('anthropic/claude-3.5-haiku', 'code');

-- google/gemini-2.0-flash-001: vision, tools, code, long-context
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('google/gemini-2.0-flash-001', 'vision'),
    ('google/gemini-2.0-flash-001', 'tools'),
    ('google/gemini-2.0-flash-001', 'code'),
    ('google/gemini-2.0-flash-001', 'long-context');

-- meta-llama/llama-3.3-70b-instruct: reasoning, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('meta-llama/llama-3.3-70b-instruct', 'reasoning'),
    ('meta-llama/llama-3.3-70b-instruct', 'code');

-- deepseek/deepseek-r1: reasoning, code, long-context
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('deepseek/deepseek-r1', 'reasoning'),
    ('deepseek/deepseek-r1', 'code'),
    ('deepseek/deepseek-r1', 'long-context');

-- mistralai/mistral-large: reasoning, tools, code
INSERT INTO "_AiModelToModelCapability" ("A", "B") VALUES
    ('mistralai/mistral-large', 'reasoning'),
    ('mistralai/mistral-large', 'tools'),
    ('mistralai/mistral-large', 'code');

-- 6. Conversation: rename model→modelId, convert totalCost Float→Int, add deletedAt, add FK
ALTER TABLE "Conversation" RENAME COLUMN "model" TO "modelId";

ALTER TABLE "Conversation"
    ALTER COLUMN "totalCost" TYPE INTEGER USING ROUND("totalCost" * 1000000)::INTEGER;

ALTER TABLE "Conversation"
    ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Fix any Conversation.modelId values not in AiModel (set to default)
UPDATE "Conversation"
SET "modelId" = 'openai/gpt-4o-mini'
WHERE "modelId" NOT IN (SELECT "id" FROM "AiModel");

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "AiModel"("id");

CREATE INDEX "Conversation_userId_deletedAt_idx" ON "Conversation"("userId", "deletedAt");

-- 7. Message: add new columns (nullable first for data migration)
ALTER TABLE "Message"
    ADD COLUMN "position"                INTEGER,
    ADD COLUMN "deletedAt"               TIMESTAMP(3),
    ADD COLUMN "inputCostPer1MSnapshot"  INTEGER,
    ADD COLUMN "outputCostPer1MSnapshot" INTEGER;

-- 8. Populate position via window function before adding NOT NULL constraint
UPDATE "Message" m
SET "position" = sub.rn
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "conversationId" ORDER BY "createdAt") AS rn
    FROM "Message"
) sub
WHERE m."id" = sub."id";

ALTER TABLE "Message" ALTER COLUMN "position" SET NOT NULL;

-- 9. Convert Message.role String→enum using explicit cast
ALTER TABLE "Message"
    ALTER COLUMN "role" TYPE "MessageRole" USING "role"::"MessageRole";

-- 10. Convert Message.cost Float→Int (micro-USD)
ALTER TABLE "Message"
    ALTER COLUMN "cost" TYPE INTEGER USING ROUND("cost" * 1000000)::INTEGER;

-- 11. Rename Message.model→modelId, add FK
ALTER TABLE "Message" RENAME COLUMN "model" TO "modelId";

-- Fix any Message.modelId values not in AiModel (set to null)
UPDATE "Message"
SET "modelId" = NULL
WHERE "modelId" IS NOT NULL AND "modelId" NOT IN (SELECT "id" FROM "AiModel");

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_conversationId_position_key"
    UNIQUE ("conversationId", "position");

CREATE INDEX "Message_conversationId_deletedAt_idx" ON "Message"("conversationId", "deletedAt");

-- 12. TokenUsage: convert totalCost Float→Int (micro-USD)
ALTER TABLE "TokenUsage"
    ALTER COLUMN "totalCost" TYPE INTEGER USING ROUND("totalCost" * 1000000)::INTEGER;
