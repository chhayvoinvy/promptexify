# Preview Path Implementation for Post Masonry Grid

## Overview

This implementation modifies the post masonry grid to display preview paths and load preview videos only when the play button is clicked, optimizing performance and user experience.

## Key Changes

### 1. **Post Masonry Grid (`components/post-masonry-grid.tsx`)**

#### **Image Display**
- **Before**: Used `post.previewPath || ""` (could be empty)
- **After**: Uses `post.previewPath || post.uploadPath` (always has a fallback)
- **Behavior**: Always displays preview images (`preview/admin123456789abcde.webp`) when available

#### **Video Display**
- **Thumbnail**: Always shows `post.previewPath` (WebP thumbnail) with play button overlay
- **Video Loading**: Only loads video when play button is clicked
- **Video Source**: Uses `post.previewVideoPath || ""` (only uses preview video, no fallback to original)

#### **Key Code Changes**
```typescript
// For images: Always use previewPath if available, fallback to uploadPath
<MediaImage
  src={post.previewPath || post.uploadPath}
  // ...
/>

// For videos: Use previewVideoPath if available, otherwise use empty string
<MediaVideo
  src={post.previewVideoPath || ""}
  previewSrc={post.previewPath || undefined}
  previewVideoSrc={post.previewVideoPath || undefined}
  usePreviewVideo={true}
  fallbackToOriginal={false}
  // ...
/>
```

### 2. **Data Layer (`lib/content.ts`)**

#### **Added `previewVideoPath` to Queries**
- `optimizedPostSelect`: Added `previewVideoPath: true`
- `getPostsWithSorting`: Added `previewVideoPath: true`
- `getRelatedPosts`: Added `previewVideoPath: true`

#### **Interface Updates**
```typescript
export interface PostWithDetails {
  // ... existing fields
  previewPath: string | null;
  previewVideoPath?: string | null;  // Added this field
  // ... rest of fields
}
```

### 3. **Media Video Component (`components/media-display.tsx`)**

The `MediaVideo` component already handles preview video logic correctly:
- Prioritizes `previewVideoSrc` when `usePreviewVideo={true}`
- Falls back to original `src` if preview video fails
- Handles preview paths through `/api/media/preview/` API

## File Path Structure

### **Original Files**
```
images/{filename}-{userPrefix}{randomId5chars}.{originalExt}
videos/{filename}-{userPrefix}{randomId5chars}.mp4
```

### **Preview Files**
```
preview/{userPrefix}{randomId15chars}.webp    // Image/video thumbnails
preview/{userPrefix}{randomId15chars}.mp4    // Video previews
```

## User Experience Flow

### **For Images**
1. **Display**: Shows `preview/admin123456789abcde.webp` (optimized WebP)
2. **Fallback**: If no preview, shows original image
3. **Performance**: Faster loading due to WebP compression

### **For Videos**
1. **Thumbnail**: Shows `preview/admin123456789abcde.webp` with play button
2. **Click Play**: Loads `preview/admin123456789abcde.mp4` (compressed video)
3. **No Fallback**: If no preview video available, shows error state
4. **Performance**: 
   - No video loading until user interaction
   - Compressed preview videos load faster
   - Reduced bandwidth usage

## Performance Benefits

### **Bandwidth Optimization**
- **Images**: WebP previews are ~30-50% smaller than original formats
- **Videos**: Preview videos are compressed (640x360, 300kbps, 15fps, 10s max)
- **Lazy Loading**: Videos only load when user clicks play

### **Loading Performance**
- **Initial Load**: Only thumbnails load, no video content
- **Progressive Enhancement**: Full video content loads on demand
- **Caching**: Preview files have 1-year cache headers

### **User Experience**
- **Faster Grid Rendering**: No video loading delays
- **Responsive Interaction**: Play button provides clear user intent
- **Preview-Only**: Only preview content is displayed, no fallback to original

## Technical Implementation Details

### **Preview Generation**
- **Images**: Sharp.js converts to WebP with configurable quality
- **Video Thumbnails**: FFmpeg extracts frame at 1 second, converts to WebP
- **Video Previews**: FFmpeg compresses to MP4 with reduced specs

### **Storage Strategy**
- **S3**: Private ACL with CloudFront CDN access
- **DigitalOcean Spaces**: Public read with CDN
- **Local**: Files in `public/uploads/preview/` directory

### **API Endpoints**
- **Preview API**: `/api/media/preview/[...path]` serves preview files
- **Content Type Detection**: Automatic MIME type detection
- **Security**: Path validation and rate limiting

## Testing

### **Test Script**
Run the verification script to check implementation:
```bash
npx tsx scripts/test-preview-paths.ts
```

### **Manual Testing**
1. **Image Posts**: Verify WebP previews display correctly
2. **Video Posts**: Verify thumbnails show with play button
3. **Video Playback**: Click play button, verify preview video loads
4. **Fallback**: Test with posts that have no preview paths

## Configuration

### **Storage Settings**
Preview generation respects dashboard settings:
- `enableCompression`: Controls whether to generate previews
- `compressionQuality`: Controls WebP quality (default: 80)
- `maxImageSize`: Limits original image size
- `maxVideoSize`: Limits original video size

### **Preview Settings**
- **Image Previews**: 1280x720 max, WebP format
- **Video Thumbnails**: 1280x720 max, WebP format  
- **Video Previews**: 640x360 max, 300kbps, 15fps, 10s duration

## Migration Notes

### **Existing Posts**
- Posts without preview paths will show error state
- Preview paths must be generated for video content to work
- Preview paths can be generated retroactively using migration scripts

### **Database Schema**
- `previewVideoPath` field already exists in Post model
- No schema changes required
- Existing queries updated to include the field

## Future Enhancements

### **Potential Improvements**
1. **Progressive Loading**: Load preview videos in background when user hovers
2. **Quality Selection**: Allow users to choose video quality
3. **Analytics**: Track preview vs original video usage
4. **Batch Processing**: Generate previews for existing posts

### **Monitoring**
- Track preview generation success rates
- Monitor bandwidth savings
- Measure user engagement with preview content

## Troubleshooting

### **Common Issues**
1. **Missing Previews**: Check if preview generation is enabled in settings
2. **Video Not Loading**: Verify preview video paths exist
3. **Performance Issues**: Check CDN configuration and cache headers

### **Debug Mode**
Development mode shows debug badges indicating:
- Whether preview video is being used
- Video source information in console logs
- Preview path validation status 