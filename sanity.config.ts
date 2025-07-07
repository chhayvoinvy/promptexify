/**
 * Enhanced Sanity Studio configuration with security and performance optimizations
 * Mounted on `/app/dashboard/pages/studio/[[...tool]]/page.tsx`
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { config } from "./sanity/env";
import { StudioNavbar } from "./sanity/StudioNavbar";
import { schema } from "./sanity/schemaTypes";
import { structure } from "./sanity/desk-structure";

export default defineConfig({
  name: "default",
  title: "Promptexify Content Studio",

  basePath: config.studio.basePath,
  projectId: config.projectId,
  dataset: config.dataset,
  apiVersion: config.apiVersion,

  // Schema configuration
  schema,

  // Studio customization
  studio: {
    components: {
      navbar: StudioNavbar,
    },
  },

  // Document actions (security enhancement)
  document: {
    actions: (prev, { schemaType }) => {
      // Remove delete action for certain document types in production
      if (config.isProduction && ["page", "helpArticle"].includes(schemaType)) {
        return prev.filter(({ action }) => action !== "delete");
      }
      return prev;
    },
  },

  // Plugins with conditional loading
  plugins: [
    // Structure tool for content organization
    structureTool({
      structure,
      defaultDocumentNode: (S, { schemaType }) => {
        // Add document views for specific schema types
        if (schemaType === "page" || schemaType === "helpArticle") {
          return S.document().views([
            S.view.form(),
            S.view
              .component(() => null)
              .title("Preview")
              .id("preview"),
          ]);
        }
        return S.document().views([S.view.form()]);
      },
    }),

    // Vision plugin (development only for security)
    ...(config.security.enableVision
      ? [
          visionTool({
            defaultApiVersion: config.apiVersion,
            defaultDataset: config.dataset,
          }),
        ]
      : []),
  ],

  // Security: Configure CORS and authentication
  cors: {
    credentials: true,
    origin: config.isProduction
      ? [`https://${process.env.NEXT_PUBLIC_BASE_URL}`]
      : ["http://localhost:3000"],
  },

  // Form configuration
  form: {
    // Image and file upload configuration
    image: {
      directUploads: true,
      assetSources: (previousAssetSources) => {
        // Only allow certain upload sources
        return previousAssetSources.filter(
          (assetSource) =>
            assetSource.name === "upload" || assetSource.name === "url"
        );
      },
    },
    file: {
      directUploads: true,
      assetSources: (previousAssetSources) => {
        return previousAssetSources.filter(
          (assetSource) => assetSource.name === "upload"
        );
      },
    },
  },

  // Search configuration
  search: {
    // Enable legacy search for better performance
    enableLegacySearch: true,
  },

  // Tasks configuration (for collaborative editing)
  tasks: {
    enabled: config.isProduction,
  },

  // Scheduling configuration
  scheduledPublishing: {
    enabled: config.isProduction,
  },

  // Beta features configuration
  beta: {
    // Enable only in development
    treeArrayEditing: {
      enabled: config.isDevelopment,
    },
  },
});
