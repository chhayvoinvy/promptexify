import { defineField, defineType } from "sanity";
import { BookText, Eye, EyeOff } from "lucide-react";

export const helpArticle = defineType({
  name: "helpArticle",
  title: "Help Article",
  type: "document",
  icon: BookText,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) =>
        Rule.required()
          .min(10)
          .max(100)
          .error("Title must be between 10 and 100 characters"),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "")
            .slice(0, 96),
      },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          if (!slug?.current) return "Slug is required";

          // Validate slug format
          const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
          if (!slugPattern.test(slug.current)) {
            return "Slug must contain only lowercase letters, numbers, and hyphens";
          }

          return true;
        }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) =>
        Rule.required()
          .min(50)
          .max(160)
          .error(
            "Description must be between 50 and 160 characters for optimal SEO"
          ),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Subscription & Billing", value: "subscription" },
          { title: "Content Contribution", value: "contribution" },
          { title: "Technical Support", value: "support" },
          { title: "Account Management", value: "account" },
          { title: "Features & Usage", value: "features" },
          { title: "Troubleshooting", value: "troubleshooting" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      validation: (Rule) => Rule.max(5).error("Maximum 5 tags allowed"),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      options: {
        list: [
          { title: "Premium (Crown)", value: "crown" },
          { title: "Contribution (Upload)", value: "upload" },
          { title: "Support (Help Circle)", value: "help-circle" },
          { title: "Account (User)", value: "user" },
          { title: "Features (Zap)", value: "zap" },
          { title: "Troubleshooting (Tool)", value: "tool" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "difficulty",
      title: "Difficulty Level",
      type: "string",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
      },
      initialValue: "beginner",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "A number to sort the articles, lower numbers appear first.",
      validation: (Rule) => Rule.min(1).max(999).integer(),
    }),
    defineField({
      name: "readingTime",
      title: "Reading Time (minutes)",
      type: "number",
      description: "Estimated time to read the article.",
      validation: (Rule) => Rule.min(1).max(60).integer(),
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [
        {
          type: "block",
          // Security: Limit available block styles
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H1", value: "h1" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          // Security: Limit available marks
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [
              {
                title: "URL",
                name: "link",
                type: "object",
                fields: [
                  {
                    title: "URL",
                    name: "href",
                    type: "url",
                    validation: (Rule) =>
                      Rule.uri({
                        allowRelative: true,
                        scheme: ["http", "https", "mailto", "tel"],
                      }),
                  },
                  {
                    title: "Open in new tab",
                    name: "blank",
                    type: "boolean",
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alternative text",
              description: "Important for SEO and accessibility.",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "caption",
              type: "string",
              title: "Caption",
            },
          ],
        },
        {
          type: "object",
          name: "codeBlock",
          title: "Code Block",
          fields: [
            {
              name: "language",
              type: "string",
              title: "Language",
              options: {
                list: [
                  { title: "JavaScript", value: "javascript" },
                  { title: "TypeScript", value: "typescript" },
                  { title: "HTML", value: "html" },
                  { title: "CSS", value: "css" },
                  { title: "JSON", value: "json" },
                  { title: "Bash", value: "bash" },
                  { title: "Python", value: "python" },
                  { title: "SQL", value: "sql" },
                ],
              },
            },
            {
              name: "code",
              type: "text",
              title: "Code",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "filename",
              type: "string",
              title: "Filename (optional)",
            },
          ],
        },
        {
          type: "object",
          name: "callout",
          title: "Callout",
          fields: [
            {
              name: "type",
              type: "string",
              title: "Type",
              options: {
                list: [
                  { title: "Info", value: "info" },
                  { title: "Warning", value: "warning" },
                  { title: "Success", value: "success" },
                  { title: "Error", value: "error" },
                  { title: "Tip", value: "tip" },
                ],
              },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "content",
              type: "text",
              title: "Content",
              validation: (Rule) => Rule.required(),
            },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      description: "The author of this help article.",
    }),
    defineField({
      name: "isPublished",
      title: "Published",
      type: "boolean",
      initialValue: false,
      description: "Check this to make the article publicly visible.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      description: "The date and time the article was published.",
      hidden: ({ document }) => !document?.isPublished,
      validation: (Rule) =>
        Rule.custom((publishedAt, context) => {
          if (context.document?.isPublished && !publishedAt) {
            return "Published date is required when article is published";
          }
          return true;
        }),
    }),
    defineField({
      name: "updatedAt",
      title: "Last Updated",
      type: "datetime",
      description: "The date and time the article was last updated.",
    }),
    defineField({
      name: "featured",
      title: "Featured Article",
      type: "boolean",
      initialValue: false,
      description: "Feature this article on the help page.",
    }),
    defineField({
      name: "relatedArticles",
      title: "Related Articles",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "helpArticle" }],
        },
      ],
      validation: (Rule) =>
        Rule.max(5).error("Maximum 5 related articles allowed"),
    }),
    defineField({
      name: "searchKeywords",
      title: "Search Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "Keywords to help users find this article.",
      options: {
        layout: "tags",
      },
      validation: (Rule) => Rule.max(10).error("Maximum 10 keywords allowed"),
    }),
    defineField({
      name: "accessLevel",
      title: "Access Level",
      type: "string",
      options: {
        list: [
          { title: "Public", value: "public" },
          { title: "Premium", value: "premium" },
          { title: "Admin Only", value: "admin" },
        ],
      },
      initialValue: "public",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "seo",
      title: "SEO Settings",
      type: "object",
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        {
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          description: "Override the default title for search engines.",
          validation: (Rule) =>
            Rule.max(60).warning("Meta title should be 60 characters or less"),
        },
        {
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          description: "Override the default description for search engines.",
          validation: (Rule) =>
            Rule.max(160).warning(
              "Meta description should be 160 characters or less"
            ),
        },
        {
          name: "noIndex",
          title: "No Index",
          type: "boolean",
          initialValue: false,
          description: "Prevent search engines from indexing this article.",
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      order: "order",
      isPublished: "isPublished",
      featured: "featured",
      readingTime: "readingTime",
    },
    prepare({ title, category, order, isPublished, featured, readingTime }) {
      const subtitle = [
        `Category: ${category}`,
        order && `Order: ${order}`,
        readingTime && `${readingTime} min read`,
        featured && "Featured",
      ]
        .filter(Boolean)
        .join(" • ");

      return {
        title,
        subtitle,
        media: isPublished ? Eye : EyeOff,
      };
    },
  },
  orderings: [
    {
      title: "Order (Ascending)",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
    {
      title: "Category A-Z",
      name: "categoryAsc",
      by: [{ field: "category", direction: "asc" }],
    },
    {
      title: "Published Date, New",
      name: "publishedDateDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Title A-Z",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
});
