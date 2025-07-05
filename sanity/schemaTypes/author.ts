import { defineField, defineType } from "sanity";
import { User, Eye, EyeOff } from "lucide-react";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  icon: User,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) =>
        Rule.required()
          .min(2)
          .max(50)
          .error("Name must be between 2 and 50 characters"),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
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
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) =>
        Rule.required().email().error("Please enter a valid email address"),
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 4,
      validation: (Rule) =>
        Rule.max(500).error("Bio must be 500 characters or less"),
    }),
    defineField({
      name: "avatar",
      title: "Avatar",
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
          description: "Important for accessibility.",
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      options: {
        list: [
          { title: "Admin", value: "admin" },
          { title: "Editor", value: "editor" },
          { title: "Author", value: "author" },
          { title: "Contributor", value: "contributor" },
        ],
      },
      initialValue: "author",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Inactive authors won't appear in author lists.",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        {
          name: "twitter",
          type: "url",
          title: "Twitter",
          description: "Twitter profile URL",
          validation: (Rule) =>
            Rule.uri({
              scheme: ["http", "https"],
            }),
        },
        {
          name: "linkedin",
          type: "url",
          title: "LinkedIn",
          description: "LinkedIn profile URL",
          validation: (Rule) =>
            Rule.uri({
              scheme: ["http", "https"],
            }),
        },
        {
          name: "github",
          type: "url",
          title: "GitHub",
          description: "GitHub profile URL",
          validation: (Rule) =>
            Rule.uri({
              scheme: ["http", "https"],
            }),
        },
        {
          name: "website",
          type: "url",
          title: "Website",
          description: "Personal website URL",
          validation: (Rule) =>
            Rule.uri({
              scheme: ["http", "https"],
            }),
        },
      ],
    }),
    defineField({
      name: "joinedAt",
      title: "Joined At",
      type: "datetime",
      description: "Date when the author joined.",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "lastActiveAt",
      title: "Last Active",
      type: "datetime",
      description: "Last time the author was active.",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "role",
      media: "avatar",
      isActive: "isActive",
    },
    prepare({ title, subtitle, media, isActive }) {
      return {
        title,
        subtitle: `${subtitle} ${isActive ? "(Active)" : "(Inactive)"}`,
        media: media || (isActive ? Eye : EyeOff),
      };
    },
  },
  orderings: [
    {
      title: "Name A-Z",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Role",
      name: "roleAsc",
      by: [{ field: "role", direction: "asc" }],
    },
    {
      title: "Joined Date, New",
      name: "joinedDateDesc",
      by: [{ field: "joinedAt", direction: "desc" }],
    },
  ],
});
