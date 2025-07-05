import { defineField, defineType } from "sanity";
import { FileText, Eye, EyeOff } from "lucide-react";

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  icon: FileText,
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

          // Check for reserved words
          const reservedWords = [
            "api",
            "admin",
            "auth",
            "dashboard",
            "help",
            "features",
            "pricing",
          ];
          if (reservedWords.includes(slug.current)) {
            return "Slug cannot be a reserved word";
          }

          return true;
        }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "A brief summary of the page for SEO and previews.",
      validation: (Rule) =>
        Rule.required()
          .min(50)
          .max(160)
          .error(
            "Description must be between 50 and 160 characters for optimal SEO"
          ),
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
      description: "The author of this page.",
    }),
    defineField({
      name: "isPublished",
      title: "Published",
      type: "boolean",
      initialValue: false,
      description: "Check this to make the page publicly visible.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      description: "The date and time the page was or will be published.",
      hidden: ({ document }) => !document?.isPublished,
      validation: (Rule) =>
        Rule.custom((publishedAt, context) => {
          if (context.document?.isPublished && !publishedAt) {
            return "Published date is required when page is published";
          }
          return true;
        }),
    }),
    defineField({
      name: "lastModified",
      title: "Last Modified",
      type: "datetime",
      readOnly: true,
      description:
        "This field is updated automatically when the document is changed.",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: {
        hotspot: true,
        accept: "image/*",
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
          description: "Important for SEO and accessibility.",
          validation: (Rule) => Rule.required(),
        },
      ],
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
        defineField({
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          description: "Override the default title for search engines.",
          validation: (Rule) =>
            Rule.max(60).warning("Meta title should be 60 characters or less"),
        }),
        defineField({
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          description: "Override the default description for search engines.",
          validation: (Rule) =>
            Rule.max(160).warning(
              "Meta description should be 160 characters or less"
            ),
        }),
        defineField({
          name: "noIndex",
          title: "No Index",
          type: "boolean",
          initialValue: false,
          description: "Prevent search engines from indexing this page.",
        }),
        defineField({
          name: "noFollow",
          title: "No Follow",
          type: "boolean",
          initialValue: false,
          description:
            "Prevent search engines from following links on this page.",
        }),
        defineField({
          name: "openGraph",
          title: "Open Graph",
          type: "object",
          options: {
            collapsible: true,
            collapsed: true,
          },
          fields: [
            {
              name: "image",
              type: "image",
              title: "Open Graph Image",
              description: "Image for social media sharing.",
              options: { hotspot: true },
            },
            {
              name: "title",
              type: "string",
              title: "Open Graph Title",
              description: "Title for social media sharing.",
            },
            {
              name: "description",
              type: "text",
              title: "Open Graph Description",
              description: "Description for social media sharing.",
            },
          ],
        }),
      ],
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
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "featuredImage",
      isPublished: "isPublished",
    },
    prepare({ title, subtitle, media, isPublished }) {
      return {
        title,
        subtitle,
        media: media || (isPublished ? Eye : EyeOff),
      };
    },
  },
  orderings: [
    {
      title: "Published Date, New",
      name: "publishedDateDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Published Date, Old",
      name: "publishedDateAsc",
      by: [{ field: "publishedAt", direction: "asc" }],
    },
    {
      title: "Title A-Z",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
});
