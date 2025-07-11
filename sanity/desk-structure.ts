import type { StructureResolver } from "sanity/structure";
import {
  FileText,
  BookText,
  Users,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  Globe,
  Lock,
} from "@/components/ui/icons";

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content Management")
    .items([
      // Content Section
      S.listItem()
        .title("Content")
        .icon(FileText)
        .child(
          S.list()
            .title("Content")
            .items([
              // Published Pages
              S.listItem()
                .title("Published Pages")
                .icon(Eye)
                .child(
                  S.documentList()
                    .title("Published Pages")
                    .filter('_type == "page" && isPublished == true')
                    .defaultOrdering([
                      { field: "publishedAt", direction: "desc" },
                    ])
                ),

              // Draft Pages
              S.listItem()
                .title("Draft Pages")
                .icon(EyeOff)
                .child(
                  S.documentList()
                    .title("Draft Pages")
                    .filter('_type == "page" && isPublished != true')
                    .defaultOrdering([
                      { field: "_updatedAt", direction: "desc" },
                    ])
                ),

              // All Pages
              S.listItem()
                .title("All Pages")
                .icon(FileText)
                .child(
                  S.documentList()
                    .title("All Pages")
                    .filter('_type == "page"')
                    .defaultOrdering([
                      { field: "_updatedAt", direction: "desc" },
                    ])
                ),
            ])
        ),

      // Help Section
      S.listItem()
        .title("Help Center")
        .icon(BookText)
        .child(
          S.list()
            .title("Help Center")
            .items([
              // Featured Articles
              S.listItem()
                .title("Featured Articles")
                .icon(Tag)
                .child(
                  S.documentList()
                    .title("Featured Articles")
                    .filter('_type == "helpArticle" && featured == true')
                    .defaultOrdering([{ field: "order", direction: "asc" }])
                ),

              // By Category
              S.listItem()
                .title("By Category")
                .icon(Tag)
                .child(
                  S.list()
                    .title("Categories")
                    .items([
                      S.listItem()
                        .title("Subscription & Billing")
                        .child(
                          S.documentList()
                            .title("Subscription & Billing")
                            .filter(
                              '_type == "helpArticle" && category == "subscription"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Content Contribution")
                        .child(
                          S.documentList()
                            .title("Content Contribution")
                            .filter(
                              '_type == "helpArticle" && category == "contribution"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Technical Support")
                        .child(
                          S.documentList()
                            .title("Technical Support")
                            .filter(
                              '_type == "helpArticle" && category == "support"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Account Management")
                        .child(
                          S.documentList()
                            .title("Account Management")
                            .filter(
                              '_type == "helpArticle" && category == "account"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Features & Usage")
                        .child(
                          S.documentList()
                            .title("Features & Usage")
                            .filter(
                              '_type == "helpArticle" && category == "features"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Troubleshooting")
                        .child(
                          S.documentList()
                            .title("Troubleshooting")
                            .filter(
                              '_type == "helpArticle" && category == "troubleshooting"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                    ])
                ),

              // By Access Level
              S.listItem()
                .title("By Access Level")
                .icon(Shield)
                .child(
                  S.list()
                    .title("Access Levels")
                    .items([
                      S.listItem()
                        .title("Public Articles")
                        .icon(Globe)
                        .child(
                          S.documentList()
                            .title("Public Articles")
                            .filter(
                              '_type == "helpArticle" && accessLevel == "public"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Premium Articles")
                        .icon(Tag)
                        .child(
                          S.documentList()
                            .title("Premium Articles")
                            .filter(
                              '_type == "helpArticle" && accessLevel == "premium"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                      S.listItem()
                        .title("Admin Only")
                        .icon(Lock)
                        .child(
                          S.documentList()
                            .title("Admin Only")
                            .filter(
                              '_type == "helpArticle" && accessLevel == "admin"'
                            )
                            .defaultOrdering([
                              { field: "order", direction: "asc" },
                            ])
                        ),
                    ])
                ),

              // All Help Articles
              S.listItem()
                .title("All Help Articles")
                .icon(BookText)
                .child(
                  S.documentList()
                    .title("All Help Articles")
                    .filter('_type == "helpArticle"')
                    .defaultOrdering([{ field: "order", direction: "asc" }])
                ),
            ])
        ),

      // Authors Section
      S.listItem()
        .title("Authors")
        .icon(Users)
        .child(
          S.list()
            .title("Authors")
            .items([
              // Active Authors
              S.listItem()
                .title("Active Authors")
                .icon(Eye)
                .child(
                  S.documentList()
                    .title("Active Authors")
                    .filter('_type == "author" && isActive == true')
                    .defaultOrdering([{ field: "name", direction: "asc" }])
                ),

              // Inactive Authors
              S.listItem()
                .title("Inactive Authors")
                .icon(EyeOff)
                .child(
                  S.documentList()
                    .title("Inactive Authors")
                    .filter('_type == "author" && isActive != true')
                    .defaultOrdering([{ field: "name", direction: "asc" }])
                ),

              // All Authors
              S.listItem()
                .title("All Authors")
                .icon(Users)
                .child(
                  S.documentList()
                    .title("All Authors")
                    .filter('_type == "author"')
                    .defaultOrdering([{ field: "name", direction: "asc" }])
                ),
            ])
        ),

      // Analytics Section (if needed)
      S.listItem()
        .title("Analytics")
        .icon(BarChart3)
        .child(
          S.list()
            .title("Analytics")
            .items([
              S.listItem()
                .title("Recently Updated")
                .icon(Calendar)
                .child(
                  S.documentList()
                    .title("Recently Updated")
                    .filter('_type in ["page", "helpArticle"]')
                    .defaultOrdering([
                      { field: "_updatedAt", direction: "desc" },
                    ])
                ),

              S.listItem()
                .title("Recently Published")
                .icon(Calendar)
                .child(
                  S.documentList()
                    .title("Recently Published")
                    .filter(
                      '_type in ["page", "helpArticle"] && defined(publishedAt)'
                    )
                    .defaultOrdering([
                      { field: "publishedAt", direction: "desc" },
                    ])
                ),
            ])
        ),

      // Divider
      S.divider(),

      // Quick Access to All Document Types
      ...S.documentTypeListItems().filter(
        (listItem) =>
          !["page", "helpArticle", "author"].includes(listItem.getId() || "")
      ),
    ]);
