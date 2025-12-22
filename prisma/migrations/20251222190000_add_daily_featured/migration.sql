-- CreateTable
CREATE TABLE "DailyFeatured" (
    "day" TEXT NOT NULL,
    "glitch_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyFeatured_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "DailyFeatured_glitch_id_idx" ON "DailyFeatured"("glitch_id");

-- AddForeignKey
ALTER TABLE "DailyFeatured" ADD CONSTRAINT "DailyFeatured_glitch_id_fkey" FOREIGN KEY ("glitch_id") REFERENCES "Glitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
