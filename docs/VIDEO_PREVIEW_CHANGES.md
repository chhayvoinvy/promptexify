# Video Preview Generation Changes

## Overview

Updated the video preview generation system to preserve the original video length and audio track, providing a better user experience while maintaining optimized file sizes.

## Changes Made

### 1. **Removed Duration Limit**
- **Before**: Preview videos were limited to 10 seconds
- **After**: Preview videos use the full original video duration
- **Impact**: Users can watch complete videos without switching to original

### 2. **Added Audio Preservation**
- **Before**: Audio was removed (`-an` flag) from preview videos
- **After**: Audio is preserved using AAC codec with 128k bitrate
- **Impact**: Preview videos now have audio, improving user experience

### 3. **Updated FFmpeg Parameters**

#### **Before:**
```bash
ffmpeg -i input.mp4 -t 10 -vf scale=640:360:force_original_aspect_ratio=decrease \
  -r 15 -b:v 300k -c:v libx264 -preset veryfast -crf 28 -an \
  -movflags +faststart -y output.mp4
```

#### **After:**
```bash
ffmpeg -i input.mp4 -vf scale=640:360:force_original_aspect_ratio=decrease \
  -r 15 -b:v 300k -c:v libx264 -c:a aac -b:a 128k -preset veryfast \
  -crf 20 -movflags +faststart -y output.mp4
```

### 4. **Key Differences**
- **Removed**: `-t 10` (duration limit)
- **Removed**: `-an` (no audio)
- **Added**: `-c:a aac` (AAC audio codec)
- **Added**: `-b:a 128k` (128k audio bitrate)
- **Changed**: `-crf 28` → `-crf 20` (higher quality)

## Files Modified

### `lib/image/preview.ts`
- Updated `VideoPreviewOptions` interface to make duration optional
- Modified `generateVideoPreview()` function to handle undefined duration
- Updated `generateCompressedVideoWithFFmpeg()` to conditionally add duration limit
- Added audio codec and bitrate parameters

### `lib/image/storage.ts`
- Updated video processing pipeline to use full duration
- Added comments explaining the new behavior

### `docs/PREVIEW_PATH_IMPLEMENTATION.md`
- Updated documentation to reflect new preview settings
- Added note about audio preservation

## Benefits

### **User Experience**
- ✅ Complete video playback without switching to original
- ✅ Audio available in preview videos
- ✅ Faster loading due to optimized compression
- ✅ Maintains aspect ratio and quality

### **Performance**
- ✅ Still optimized file sizes (640x360, 300kbps video, 128kbps audio)
- ✅ Web-optimized with `+faststart` flag
- ✅ Efficient H.264 encoding with CRF 20 (higher quality)

### **Technical**
- ✅ Backward compatible (duration parameter is optional)
- ✅ Maintains existing compression settings
- ✅ Uses industry-standard AAC audio codec

## Testing

Run the test script to verify changes:
```bash
npx tsx scripts/test-video-preview-changes.ts
```

## Migration Notes

### **Existing Videos**
- Existing preview videos will continue to work
- New uploads will generate previews with full duration and audio
- No database changes required

### **Storage Impact**
- Preview videos will be larger due to audio and full duration
- Still significantly smaller than original videos
- Audio adds approximately 128kbps to file size

## Quality Settings

### **CRF (Constant Rate Factor) Mapping**
- **Quality 70**: CRF 21 (good quality, smaller file)
- **Quality 80**: CRF 20 (better quality, balanced file size) ⭐ **Current Setting**
- **Quality 90**: CRF 19 (high quality, larger file)

### **Quality vs File Size Trade-off**
- Higher quality = larger file size
- Lower quality = smaller file size
- CRF range: 18-28 (18 = best quality, 28 = smallest file)

## Future Considerations

1. **Audio Controls**: Consider adding volume controls for preview videos
2. **Quality Selection**: Allow users to choose between preview and original
3. **Analytics**: Track usage of preview vs original videos
4. **Caching**: Implement smart caching for frequently accessed previews

## Verification

To verify the changes work correctly:

1. **Upload a video** with audio and duration > 10 seconds
2. **Check the preview video** has:
   - Full original duration
   - Audio track
   - Optimized file size
   - Proper playback in browser
3. **Compare file sizes** between original and preview
4. **Test playback** in different browsers and devices 