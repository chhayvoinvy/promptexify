-- Add preview fields to Media model
ALTER TABLE "media" ADD COLUMN "previewUrl" TEXT;
ALTER TABLE "media" ADD COLUMN "previewPath" TEXT;

-- Add indexes for better query performance
CREATE INDEX "media_previewUrl_idx" ON "media"("previewUrl");
CREATE INDEX "media_previewPath_idx" ON "media"("previewPath"); 