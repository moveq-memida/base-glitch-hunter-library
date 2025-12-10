-- CreateTable
CREATE TABLE "Glitch" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "game_name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "video_url" TEXT,
    "description" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "author_address" TEXT NOT NULL,
    "onchain_glitch_id" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Glitch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Glitch_onchain_glitch_id_idx" ON "Glitch"("onchain_glitch_id");

-- CreateIndex
CREATE INDEX "Glitch_created_at_idx" ON "Glitch"("created_at");
