// contentlayer.config.ts
import {
  defineDocumentType,
  makeSource
} from "contentlayer2/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
var defaultComputedFields = {
  slug: {
    type: "string",
    resolve: (doc) => `/${doc._raw.flattenedPath}`
  },
  slugAsParams: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/")
  },
  readingTime: {
    type: "number",
    resolve: (doc) => {
      const wordsPerMinute = 200;
      const wordCount = doc.body.raw.split(/\s+/).length;
      return Math.ceil(wordCount / wordsPerMinute);
    }
  }
};
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: true
    },
    category: {
      type: "string",
      required: true
    },
    parentCategory: {
      type: "string",
      required: true
    },
    tags: {
      type: "list",
      of: { type: "string" },
      default: []
    },
    featuredImage: {
      type: "string"
    },
    isPremium: {
      type: "boolean",
      default: false
    },
    isPublished: {
      type: "boolean",
      default: false
    },
    publishedAt: {
      type: "date",
      required: true
    },
    authorId: {
      type: "string",
      required: true
    }
  },
  computedFields: defaultComputedFields
}));
var Page = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: `legal/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: true
    },
    lastUpdated: {
      type: "date",
      required: true
    }
  },
  computedFields: defaultComputedFields
}));
var Help = defineDocumentType(() => ({
  name: "Help",
  filePathPattern: `help/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: true
    },
    category: {
      type: "string",
      required: true
    },
    icon: {
      type: "string",
      required: false
    },
    order: {
      type: "number",
      required: false,
      default: 0
    },
    lastUpdated: {
      type: "date",
      required: true
    }
  },
  computedFields: defaultComputedFields
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content",
  documentTypes: [Post, Page, Help],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      () => (tree) => {
        visit(tree, (node) => {
          if (node?.type === "element" && node?.tagName === "pre") {
            const [codeEl] = node.children;
            if (codeEl.tagName !== "code")
              return;
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
          onVisitLine(node) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          }
        }
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
            ariaLabel: "Link to section"
          }
        }
      ]
    ]
  }
});
export {
  Help,
  Page,
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-75UAD3Y3.mjs.map
