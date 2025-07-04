import { defineField, defineType } from "sanity";

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "A brief summary of the page for SEO and previews.",
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "isPublished",
      title: "Is Published",
      type: "boolean",
      initialValue: true,
      description: "Check this to make the page publicly visible.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      description: "The date and time the page was or will be published.",
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
      name: "seo",
      title: "SEO Settings",
      type: "object",
      fields: [
        defineField({
          name: "noIndex",
          title: "No Index",
          type: "boolean",
          initialValue: false,
          description: "Prevent search engines from indexing this page.",
        }),
      ],
    }),
  ],
});
