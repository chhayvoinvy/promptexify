# SEO Configuration

This directory contains centralized SEO configuration for the Promptexify application.

## Files

- `seo.ts` - Main SEO configuration with default metadata and helper functions

## Usage

### 1. Default SEO Configuration

The main layout uses the default SEO configuration:

```typescript
// app/layout.tsx
import { seoConfig } from "@/config/seo";

export const metadata = seoConfig;
```

### 2. Using Predefined Page Configurations

For common page types, use the predefined configurations:

```typescript
// app/(main)/(pages)/features/page.tsx
import { getMetadata } from "@/config/seo";

export const metadata = getMetadata("features");
```

Available page types:
- `home` - Homepage
- `directory` - AI Prompt Directory
- `features` - Features page
- `pricing` - Pricing page
- `help` - Help center
- `about` - About page
- `contact` - Contact page

### 3. Custom SEO Configuration

For pages with custom metadata, use the setMetadata function:

```typescript
// app/(main)/(pages)/prompt-generator/page.tsx
import { setMetadata } from "@/config/seo";

export const metadata = setMetadata({
  title: "Prompt Generator - Promptexify",
  description: "AI-powered prompt generator coming soon to Promptexify.",
  openGraph: {
    title: "Prompt Generator - Promptexify",
    description: "AI-powered prompt generator coming soon to Promptexify.",
  },
});
```

### 4. Dynamic SEO Configuration

For pages with dynamic content, use generateMetadata:

```typescript
// app/(main)/(pages)/help/[slug]/page.tsx
import { setMetadata } from "@/config/seo";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticle(slug);

  if (!article) {
    return setMetadata({
      title: "Help Article Not Found",
      description: "The requested help article could not be found.",
    });
  }

  return setMetadata({
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.description,
    openGraph: {
      title: article.seo?.metaTitle || article.title,
      description: article.seo?.metaDescription || article.description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  });
}
```

### 5. Post-Specific SEO Configuration

For individual post pages, use the specialized helper:

```typescript
// app/(main)/entry/[id]/page.tsx
import { generatePostMetadata } from "@/config/seo";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return setMetadata({
      title: "Post Not Found",
      description: "The requested post could not be found.",
      robots: { index: false, follow: false },
    });
  }

  return generatePostMetadata(post);
}
```

The `generatePostMetadata` function automatically:
- Creates SEO-friendly titles and descriptions
- Generates keywords from post data (category, tags, etc.)
- Sets up OpenGraph images using post previews
- Configures Twitter Cards
- Adds canonical URLs
- Sets appropriate robots directives

## Configuration Structure

### Default SEO Config (`seoConfig`)

- **Title**: Default title and template
- **Description**: Comprehensive description targeting AI prompt keywords
- **Keywords**: Extensive keyword array covering AI tools
- **OpenGraph**: Social media sharing configuration
- **Twitter**: Twitter Card configuration
- **Robots**: Search engine crawling directives
- **Icons**: Favicon and manifest configuration

### Page SEO Configs (`pageSEOConfigs`)

Predefined configurations for common page types with:
- Optimized titles and descriptions
- Consistent branding
- SEO-friendly content targeting

### Helper Functions

- `setMetadata()` - Set custom metadata with default config
- `getMetadata()` - Get predefined metadata for page types
- `generatePostMetadata()` - Generate optimized metadata for individual posts

## Benefits

1. **Centralized Management**: All SEO configuration in one place
2. **Consistency**: Ensures consistent branding across pages
3. **Maintainability**: Easy to update global SEO settings
4. **Type Safety**: Full TypeScript support
5. **Flexibility**: Supports both predefined and custom configurations

## Best Practices

1. **Use predefined configs** for common page types
2. **Use setMetadata** for custom pages
3. **Use generateMetadata** for dynamic content
4. **Use generatePostMetadata** for individual post pages
5. **Keep descriptions under 160 characters** for optimal display
6. **Include relevant keywords** in titles and descriptions
7. **Test OpenGraph** with social media debugging tools 