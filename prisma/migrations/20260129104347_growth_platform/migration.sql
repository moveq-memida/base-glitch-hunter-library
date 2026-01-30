-- CreateEnum
CREATE TYPE "SpeedrunCategory" AS ENUM ('ANY_PERCENT', 'HUNDRED_PERCENT', 'LOW_PERCENT', 'GLITCHLESS', 'ALL_BOSSES', 'OTHER');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "Glitch" ADD COLUMN     "difficulty" INTEGER DEFAULT 3,
ADD COLUMN     "estimated_time_save" TEXT,
ADD COLUMN     "game_id" INTEGER,
ADD COLUMN     "game_version" TEXT,
ADD COLUMN     "speedrun_category" "SpeedrunCategory" DEFAULT 'ANY_PERCENT',
ADD COLUMN     "user_id" INTEGER;

-- CreateTable
CREATE TABLE "ReproductionStep" (
    "id" SERIAL NOT NULL,
    "glitch_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "timestamp" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReproductionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT,
    "privy_user_id" TEXT,
    "email" TEXT,
    "discord_id" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_votes_received" INTEGER NOT NULL DEFAULT 0,
    "total_stamps" INTEGER NOT NULL DEFAULT 0,
    "tier" "UserTier" NOT NULL DEFAULT 'BRONZE',
    "reputation_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "glitch_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ja" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ja" TEXT NOT NULL,
    "icon_url" TEXT,
    "tier" "UserTier" NOT NULL DEFAULT 'BRONZE',
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "price_usd" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "release_year" INTEGER,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "speedrun_com_id" TEXT,
    "cover_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "game_filter" TEXT,
    "prize_description" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" SERIAL NOT NULL,
    "contest_id" INTEGER NOT NULL,
    "glitch_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "glitch_id" INTEGER,
    "user_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReproductionStep_glitch_id_idx" ON "ReproductionStep"("glitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReproductionStep_glitch_id_step_number_key" ON "ReproductionStep"("glitch_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_address_key" ON "User"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "User_privy_user_id_key" ON "User"("privy_user_id");

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "User"("tier");

-- CreateIndex
CREATE INDEX "User_reputation_points_idx" ON "User"("reputation_points");

-- CreateIndex
CREATE INDEX "Vote_glitch_id_idx" ON "Vote"("glitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_user_id_glitch_id_key" ON "Vote"("user_id", "glitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_badge_id_idx" ON "UserBadge"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_user_id_badge_id_key" ON "UserBadge"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_name_idx" ON "Game"("name");

-- CreateIndex
CREATE INDEX "Contest_status_idx" ON "Contest"("status");

-- CreateIndex
CREATE INDEX "Contest_start_date_end_date_idx" ON "Contest"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "ContestEntry_user_id_idx" ON "ContestEntry"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contest_id_glitch_id_key" ON "ContestEntry"("contest_id", "glitch_id");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_type_idx" ON "AnalyticsEvent"("event_type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_glitch_id_idx" ON "AnalyticsEvent"("glitch_id");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_created_at_idx" ON "AnalyticsEvent"("created_at");

-- CreateIndex
CREATE INDEX "Glitch_game_id_idx" ON "Glitch"("game_id");

-- CreateIndex
CREATE INDEX "Glitch_user_id_idx" ON "Glitch"("user_id");

-- CreateIndex
CREATE INDEX "Glitch_speedrun_category_idx" ON "Glitch"("speedrun_category");

-- AddForeignKey
ALTER TABLE "Glitch" ADD CONSTRAINT "Glitch_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Glitch" ADD CONSTRAINT "Glitch_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReproductionStep" ADD CONSTRAINT "ReproductionStep_glitch_id_fkey" FOREIGN KEY ("glitch_id") REFERENCES "Glitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_glitch_id_fkey" FOREIGN KEY ("glitch_id") REFERENCES "Glitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_glitch_id_fkey" FOREIGN KEY ("glitch_id") REFERENCES "Glitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_glitch_id_fkey" FOREIGN KEY ("glitch_id") REFERENCES "Glitch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
