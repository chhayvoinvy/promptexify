import { type SchemaTypeDefinition } from "sanity";
import { page } from "./page";
import { helpArticle } from "./helpArticle";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [page, helpArticle],
};
