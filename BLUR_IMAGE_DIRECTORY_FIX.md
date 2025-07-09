# Blur Image Directory Page Fix

## Problem
Blur images were working on the homepage but not showing on the `/directory` page. Users were seeing loading skeletons instead of the smooth blur-to-sharp transitions.

## Root Cause
The issue was that the `OptimizedQueries` in `lib/query.ts` were not including the `featuredImageBlur` field in their select statements. Additionally, some functions in `lib/content.ts` were using `include` instead of `select`, which meant they weren't explicitly selecting the blur field.

## Files Fixed

### 1. `lib/query.ts`
**Problem**: The `POST_SELECTS` objects didn't include `featuredImageBlur`

**Solution**: Added `featuredImageBlur: true` to all relevant select objects:

```typescript
// Before
list: {
  id: true,
  title: true,
  // ... other fields
  featuredImage: true,
  featuredVideo: true,
  // ... rest of fields
}

// After
list: {
  id: true,
  title: true,
  // ... other fields
  featuredImage: true,
  featuredImageBlur: true, // ✅ Added
  featuredVideo: true,
  // ... rest of fields
}
```

**Fixed select objects**:
- `POST_SELECTS.list` - Used for post listings
- `POST_SELECTS.full` - Used for detailed post views  
- `POST_SELECTS.api` - Used for API responses
- `POST_SELECTS.admin` - Used for admin views

### 2. `lib/content.ts`
**Problem**: Two functions were using `include` instead of `select`, which didn't explicitly include the blur field

**Solution**: Changed from `include` to explicit `select` with blur field:

#### A. `getPostsWithSorting` function
```typescript
// Before
const posts = await prisma.post.findMany({
  where: { /* ... */ },
  include: {
    // ... includes all fields by default
  },
});

// After  
const posts = await prisma.post.findMany({
  where: { /* ... */ },
  select: {
    id: true,
    title: true,
    // ... other fields
    featuredImage: true,
    featuredImageBlur: true, // ✅ Added
    featuredVideo: true,
    // ... rest of fields
  },
});
```

#### B. `getRelatedPosts` function
```typescript
// Before
const posts = await prisma.post.findMany({
  where: { /* ... */ },
  include: {
    // ... includes all fields by default
  },
});

// After
const posts = await prisma.post.findMany({
  where: { /* ... */ },
  select: {
    id: true,
    title: true,
    // ... other fields
    featuredImage: true,
    featuredImageBlur: true, // ✅ Added
    featuredVideo: true,
    // ... rest of fields
  },
});
```

### 3. `components/post-standalone-page.tsx`
**Problem**: The standalone post page wasn't using blur data

**Solution**: Added `blurDataURL` prop to the `MediaImage` component:

```typescript
// Before
<MediaImage
  src={post.featuredImage}
  alt={post.title}
  width={800}
  height={400}
  className="w-full h-auto max-h-80 object-contain"
  priority
/>

// After
<MediaImage
  src={post.featuredImage}
  alt={post.title}
  width={800}
  height={400}
  className="w-full h-auto max-h-80 object-contain"
  priority
  blurDataURL={post.featuredImageBlur || undefined} // ✅ Added
/>
```

## How the Directory Page Works

1. **Initial Load**: Directory page uses `OptimizedQueries.posts.getPaginated()` for the first page
2. **Infinite Scroll**: Uses `/api/posts` endpoint which also uses `OptimizedQueries.posts.getPaginated()`
3. **Component Rendering**: `InfinitePostGrid` → `PostMasonryGrid` → `PostCard` → `MediaImage`

## Data Flow After Fix

1. **Database Query**: `OptimizedQueries` now includes `featuredImageBlur` in select
2. **API Response**: `/api/posts` returns posts with blur data
3. **Component Props**: `PostCard` receives `post.featuredImageBlur`
4. **MediaImage**: Uses `blurDataURL={post.featuredImageBlur || undefined}`
5. **Display**: Shows blur immediately, then fades to sharp image

## Testing

### Before Fix
- Homepage: ✅ Blur images working
- Directory page: ❌ Loading skeletons instead of blur
- Standalone post: ❌ No blur transition

### After Fix  
- Homepage: ✅ Blur images working
- Directory page: ✅ Blur images working
- Standalone post: ✅ Blur images working

## Verification

To verify the fix is working:

1. **Check Network Tab**: Look for base64 data URLs being loaded
2. **Visual Test**: Images should show blur immediately, then fade to sharp
3. **Database Check**: Ensure posts have blur data:
   ```bash
   npx tsx -e "
   import { prisma } from './lib/prisma.js';
   const posts = await prisma.post.findMany({
     where: { featuredImageBlur: { not: null } },
     select: { title: true, featuredImageBlur: true }
   });
   console.log('Posts with blur:', posts.length);
   "
   ```

## Performance Impact

- **Minimal**: Only ~100-300 bytes per image added to queries
- **Beneficial**: Better perceived performance with immediate visual feedback
- **Progressive**: Graceful fallback for images without blur data

## Future Considerations

1. **Cache Invalidation**: May need to clear caches if blur data was missing
2. **Backfill**: Run backfill script for existing images without blur data
3. **Monitoring**: Watch for any performance impact from additional field selection 