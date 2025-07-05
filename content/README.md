# Automation Content Directory

This directory contains JSON files used for automated content generation.

## Purpose

The automation system processes JSON files in this directory to generate posts, tags, and categories in the application database.

## File Format

Each JSON file must follow this structure:

```json
{
  "category": "category-slug",
  "tags": [
    {
      "name": "Tag Name",
      "slug": "tag-slug"
    }
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
      "isFeatured": false,
      "featuredImage": "https://example.com/image.jpg"
    }
  ]
}
```

## Security

- All content is validated and sanitized before processing
- File size limits are enforced
- Only JSON files are accepted
- Content is checked for suspicious patterns

## Usage

1. Place your JSON files in this directory
2. Use the automation dashboard to run content generation
3. The system processes files and creates database entries

## Guidelines

- Use descriptive filenames (e.g., `marketing-prompts.json`)
- Keep file sizes under 5MB
- Ensure all slugs are unique across your content
- Test with small files first
