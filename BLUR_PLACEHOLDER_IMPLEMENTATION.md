# Blur Placeholder Implementation (LQIP)

This document describes the implementation of Unsplash-style blur placeholders (Low Quality Image Placeholders) in the project.

## Overview

The system now generates tiny, blurred, base64-encoded images that serve as placeholders while the full images load. This creates a smooth "blur-up" effect similar to Unsplash.

## Implementation Details

### Database Schema
- Added `featuredImageBlur` field to the `Post` model in Prisma schema
- Stores base64-encoded blur data (e.g., `data:image/jpeg;base64,...`)

### Core Components

#### 1. Blur Generation (`lib/blur.ts`)
- `generateBlurPlaceholder()` - Creates a base64 blur placeholder from image buffer
- Uses Sharp library for image processing
- Generates 10x10 pixel blurred images in JPEG format
- Configurable quality and blur settings

#### 2. Upload Pipeline (`lib/storage.ts`)
- Modified `processAndUploadImageWithConfig()` to generate blur data during upload
- Added `blurDataUrl` field to `UploadResult` interface
- Blur generation happens server-side during image processing

#### 3. Frontend Components
- Updated `MediaImage` component to use `placeholder="blur"` when blur data is available
- Modified `PostCard` and `PostMasonryGrid` to pass blur data
- Updated post creation/editing forms to capture and store blur data

#### 4. Content Fetching (`lib/content.ts`)
- Added `featuredImageBlur` to post select queries
- Updated `PostWithDetails` interface to include blur field

### Usage

#### For New Images
Blur placeholders are automatically generated when images are uploaded through the MediaUpload component.

#### For Existing Images
Run the backfill script to generate blur data for existing images:

```bash
npx tsx scripts/backfill-blur-data.ts
```

### Storage Compatibility

The blur placeholder system works with all supported storage types:
- **Local Storage** - Blur data stored in database, images on disk
- **AWS S3** - Blur data stored in database, images in S3 bucket
- **DigitalOcean Spaces** - Blur data stored in database, images in DO Spaces

The blur placeholder is independent of storage location since it's stored as base64 in the database.

### Performance Considerations

- Blur placeholders are ~100-300 bytes each
- Generation adds ~50-100ms to upload time
- Significantly improves perceived loading performance
- Reduces layout shift during image loading

### Future Enhancements

1. **Adaptive Quality** - Adjust blur quality based on image content
2. **Color Extraction** - Extract dominant colors for even faster placeholders
3. **Progressive Enhancement** - Fallback gracefully if blur data is missing
4. **Cleanup Script** - Remove orphaned blur data from deleted images

## Technical Notes

- Blur data is only generated for image uploads, not videos
- Uses JPEG format for blur placeholders (better compression than PNG)
- Base64 encoding keeps blur data inline with post data
- Blur generation is optional - system gracefully handles missing blur data 