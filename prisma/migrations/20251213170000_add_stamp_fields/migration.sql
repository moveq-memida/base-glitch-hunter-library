-- AlterTable
ALTER TABLE "Glitch"
ADD COLUMN "stamp_hash" TEXT,
ADD COLUMN "stamp_tx_hash" TEXT,
ADD COLUMN "stamped_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Glitch_stamp_hash_key" ON "Glitch"("stamp_hash");

