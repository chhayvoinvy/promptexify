-- Add onDelete SetNull constraint to media.postId foreign key
-- This ensures that when a post is deleted, the associated media records
-- have their postId set to NULL instead of being deleted

-- First, drop the existing foreign key constraint
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_postId_fkey";

-- Re-add the foreign key constraint with SET NULL on delete
ALTER TABLE "media" ADD CONSTRAINT "media_postId_fkey" 
  FOREIGN KEY ("postId") REFERENCES "posts"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE; 