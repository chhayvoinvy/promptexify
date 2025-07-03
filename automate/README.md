# Automated Content Seeding

This directory contains the automated content seeding system for Promptexify. It allows you to create posts by defining them in JSON files organized by category.

## Directory Structure

```
automate/
├── content/
│   ├── chatgpt-prompts.json
│   ├── gemini-prompts.json
│   ├── claude-prompts.json
│   └── [category]-prompts.json
├── generator.ts
├── settings.ts
└── README.md
```

## JSON File Format

Each JSON file in the `content/` directory should follow this structure:

```json
{
  "category": "category-slug",
  "tags": [
    { "name": "Tag Name", "slug": "tag-slug" },
    { "name": "Another Tag", "slug": "another-tag" }
  ],
  "posts": [
    {
      "title": "Post Title",
      "slug": "post-slug",
      "description": "Brief description of the post",
      "content": "Full content of the post",
      "isPremium": false,
      "isPublished": true,
      "status": "APPROVED",
      "isFeatured": true,
      "featuredImage": "https://example.com/image.jpg" // Optional
    }
  ]
}
```

## Field Descriptions

### Category
- `category`: The slug of the category (will be created if it doesn't exist)

### Tags
- `name`: Display name of the tag
- `slug`: URL-friendly version of the tag name

### Posts
- `title`: The post title
- `slug`: URL-friendly version of the title (must be unique)
- `description`: Brief description for SEO and previews
- `content`: Full post content
- `isPremium`: Boolean indicating if the post requires premium access
- `isPublished`: Boolean indicating if the post is published
- `status`: Post status ("APPROVED", "PENDING", "REJECTED")
- `isFeatured`: Boolean indicating if the post should be featured
- `featuredImage`: Optional URL to a featured image

## Configuration

The seeding system can be configured through `settings.ts`:

```typescript
export const seedConfig: SeedConfig = {
  // Default author ID for all seeded posts
  authorId: "b8cb0435-491a-47c4-9d6e-3364a19e8264",
  
  // Directory containing JSON content files
  contentDirectory: "automate/content",
  
  // Random view count range for posts
  randomViewCountRange: {
    min: 1,
    max: 500,
  },
  
  // Logging configuration
  logging: {
    enabled: true,
    verbose: true,
  },
};
```

## Usage

1. Configure settings in `automate/settings.ts` if needed
2. Create or modify JSON files in the `automate/content/` directory
3. Run the seeding command:

```bash
npm run content:generate
```

## Features

- **Configurable Settings**: Customize author ID, directories, view count ranges, and logging through `settings.ts`
- **Automatic Category Creation**: Categories are created automatically if they don't exist
- **Tag Management**: Tags are created or reused if they already exist
- **Duplicate Prevention**: Posts with existing slugs are skipped to prevent duplicates
- **Configurable View Counts**: Posts are assigned random view counts within configurable ranges
- **Flexible Logging**: Enable/disable logging and verbose output through configuration

## Examples

See the existing JSON files in the `content/` directory for examples:
- `chatgpt-prompts.json` - ChatGPT related prompts
- `gemini-prompts.json` - Google Gemini prompts
- `claude-prompts.json` - Anthropic Claude prompts

## Notes

- Author ID can be configured in `settings.ts` (default: `b8cb0435-491a-47c4-9d6e-3364a19e8264`)
- Categories and tags are created in the local Prisma database
- The system handles both new and existing categories/tags gracefully
- Post slugs must be unique across the entire database
- All configuration options are centralized in `settings.ts` for easy management