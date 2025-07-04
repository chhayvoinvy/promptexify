import { defineField, defineType } from "sanity";
import { BookText } from "lucide-react";

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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "e.g., subscription, contribution, support",
      validation: (Rule) => Rule.required(),
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
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "A number to sort the articles, lower numbers appear first.",
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "readingTime",
      title: "Reading Time (minutes)",
      type: "number",
      description: "Estimated time to read the article.",
      validation: (Rule) => Rule.min(1),
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      order: "order",
    },
    prepare({ title, category, order }) {
      return {
        title,
        subtitle: `Category: ${category} | Order: ${order}`,
      };
    },
  },
});
