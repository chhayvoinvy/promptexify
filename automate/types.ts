export interface ProcessingStats {
  filesProcessed: number;
  postsCreated: number;
  tagsCreated: number;
  categoriesCreated: number;
  errors: string[];
  warnings: string[];
}
