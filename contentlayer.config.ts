import {
  ComputedFields,
  defineDocumentType,
  makeSource,
} from "contentlayer2/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

const defaultComputedFields: ComputedFields = {
  slug: {
    type: "string",
    resolve: (doc) => `/${doc._raw.flattenedPath}`,
  },
  slugAsParams: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/"),
  },
  readingTime: {
    type: "number",
    resolve: (doc) => {
      const wordsPerMinute = 200;
      const wordCount = doc.body.raw.split(/\s+/).length;
      return Math.ceil(wordCount / wordsPerMinute);
    },
  },
};

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
      required: true,
    },
    category: {
      type: "string",
      required: true,
    },
    parentCategory: {
      type: "string",
      required: true,
    },
    tags: {
      type: "list",
      of: { type: "string" },
      default: [],
    },
    featuredImage: {
      type: "string",
    },
    isPremium: {
      type: "boolean",
      default: false,
    },
    isPublished: {
      type: "boolean",
      default: false,
    },
    publishedAt: {
      type: "date",
      required: true,
    },
    authorId: {
      type: "string",
      required: true,
    },
  },
  computedFields: defaultComputedFields,
}));

export const Page = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: `{legal,company,about,contact,privacy,terms,cookies,sitemap,robots,404,500,503,403}/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
      required: true,
    },
    lastUpdated: {
      type: "date",
      required: true,
    },
  },
  computedFields: defaultComputedFields,
}));

export const Help = defineDocumentType(() => ({
  name: "Help",
  filePathPattern: `help/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
      required: true,
    },
    category: {
      type: "string",
      required: true,
    },
    icon: {
      type: "string",
      required: false,
    },
    order: {
      type: "number",
      required: false,
      default: 0,
    },
    lastUpdated: {
      type: "date",
      required: true,
    },
  },
  computedFields: defaultComputedFields,
}));

export default makeSource({
  contentDirPath: "./content",
  documentTypes: [Post, Page, Help],
  disableImportAliasWarning: true,

  // Build performance optimizations
  onSuccess: async (importData) => {
    const { allDocuments } = await importData();
    console.log(`✅ Generated ${allDocuments.length} documents`);
  },

  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      () => (tree) => {
        visit(tree, (node) => {
          if (node?.type === "element" && node?.tagName === "pre") {
            const [codeEl] = node.children;

            if (codeEl.tagName !== "code") return;

            node.__rawString__ = codeEl.children?.[0].value;
          }
        });
      },
      [
        rehypePrettyCode,
        {
          theme: "github-dark",
          keepBackground: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onVisitLine(node: any) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
        },
      ],
      () => (tree) => {
        visit(tree, (node) => {
          if (node?.type === "element" && node?.tagName === "figure") {
            if (!("data-rehype-pretty-code-figure" in node.properties)) {
              return;
            }

            const preElement = node.children.at(-1);
            if (preElement.tagName !== "pre") {
              return;
            }

            preElement.properties["__rawString__"] = node.__rawString__;
          }
        });
      },
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
});
