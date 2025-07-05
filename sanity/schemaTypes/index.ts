import { type SchemaTypeDefinition } from "sanity";
import { author } from "./author";
import { page } from "./page";
import { helpArticle } from "./helpArticle";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Content types
    page,
    helpArticle,

    // Reference types
    author,
  ],
};
