import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateFeaturedMedia() {
  console.log('Starting featured media migration...');

  try {
    // Get all posts that have featuredImage or featuredVideo
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { featuredImage: { not: null } },
          { featuredVideo: { not: null } }
        ]
      },
      select: {
        id: true,
        featuredImage: true,
        featuredVideo: true,
        blurData: true
      }
    });

    console.log(`Found ${posts.length} posts to migrate`);

    for (const post of posts) {
      let uploadPath: string | null = null;
      let uploadFileType: 'IMAGE' | 'VIDEO' | null = null;

      // Determine which field has data and set the appropriate values
      if (post.featuredImage) {
        uploadPath = post.featuredImage;
        uploadFileType = 'IMAGE';
        console.log(`Migrating post ${post.id}: featuredImage -> uploadPath (IMAGE)`);
      } else if (post.featuredVideo) {
        uploadPath = post.featuredVideo;
        uploadFileType = 'VIDEO';
        console.log(`Migrating post ${post.id}: featuredVideo -> uploadPath (VIDEO)`);
      }

      // Update the post with new fields
      if (uploadPath && uploadFileType) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            uploadPath,
            uploadFileType,
            // Keep blurData as is since it's already in the correct format
          }
        });
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateFeaturedMedia()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  }); 