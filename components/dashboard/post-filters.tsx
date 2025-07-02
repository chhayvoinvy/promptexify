"use client";

import { useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface PostFiltersProps {
  currentPageSize: number;
  currentPage: number;
  totalCount: number;
  filters: {
    category?: string;
    subcategory?: string;
    status?: string;
    type?: string;
    featured?: string;
    sortBy?: string;
  };
  categories: FilterOption[];
  isAdmin: boolean;
}

export function PostFilters({
  currentPageSize,
  currentPage,
  totalCount,
  filters,
  categories,
  isAdmin,
}: PostFiltersProps) {
  const router = useRouter();
  const pageSizeOptions = [5, 10, 20, 50];

  const statusOptions: FilterOption[] = [
    { value: "all", label: "All Status" },
    { value: "published", label: "Published" },
    { value: "pending", label: "Pending Review" },
    { value: "draft", label: "Draft" },
    { value: "rejected", label: "Rejected" },
  ];

  const typeOptions: FilterOption[] = [
    { value: "all", label: "All Types" },
    { value: "free", label: "Free" },
    { value: "premium", label: "Premium" },
  ];

  const featuredOptions: FilterOption[] = [
    { value: "all", label: "All Posts" },
    { value: "featured", label: "Featured Only" },
    { value: "not-featured", label: "Not Featured" },
  ];

  const sortOptions: FilterOption[] = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "views", label: "Most Views" },
    { value: "title", label: "Title A-Z" },
  ];

  // Separate parent and child categories
  const parentCategories = categories.filter(
    (cat) => !cat.label.includes(" > ")
  );
  const allChildCategories = categories.filter((cat) =>
    cat.label.includes(" > ")
  );

  // Get child categories for selected parent category
  const selectedParentCategory =
    filters.category && filters.category !== "all"
      ? categories.find(
          (cat) => cat.value === filters.category && !cat.label.includes(" > ")
        )
      : null;

  const childCategories = selectedParentCategory
    ? allChildCategories.filter((cat) =>
        cat.label.startsWith(selectedParentCategory.label + " > ")
      )
    : [];

  const generateFilterUrl = (
    newFilters: Record<string, string | undefined>
  ) => {
    const url = new URL("/dashboard/posts", window.location.origin);

    // Preserve current filters and apply new ones
    const combinedFilters = { ...filters, ...newFilters };

    // Add non-default values to URL
    Object.entries(combinedFilters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "newest") {
        url.searchParams.set(key, value);
      }
    });

    // Add current page size if not default
    if (currentPageSize !== 10) {
      url.searchParams.set("pageSize", currentPageSize.toString());
    }

    return url.pathname + url.search;
  };

  const generatePageSizeUrl = (newPageSize: number) => {
    const url = new URL("/dashboard/posts", window.location.origin);

    // Preserve current filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "newest") {
        url.searchParams.set(key, value);
      }
    });

    if (newPageSize !== 10) {
      url.searchParams.set("pageSize", newPageSize.toString());
    }

    return url.pathname + url.search;
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters: Record<string, string | undefined> = {
      [filterType]: value,
    };

    // Reset subcategory when parent category changes
    if (filterType === "category") {
      newFilters.subcategory = "all";
    }

    const newUrl = generateFilterUrl(newFilters);
    router.push(newUrl);
  };

  const handlePageSizeChange = (value: string) => {
    const newUrl = generatePageSizeUrl(parseInt(value));
    router.push(newUrl);
  };

  const clearFilters = () => {
    router.push("/dashboard/posts");
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value !== "all" && value !== "newest"
  );

  const startIndex = (currentPage - 1) * currentPageSize + 1;
  const endIndex = Math.min(currentPage * currentPageSize, totalCount);

  return (
    <div className="space-y-1">
      {/* Results Info and Page Size */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex} to {endIndex} of {totalCount} posts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Posts per page:</p>
          <Select
            value={currentPageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Category Filter */}
        <Select
          value={filters.category || "all"}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {parentCategories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subcategory Filter - Only show when parent category is selected */}
        {filters.category &&
          filters.category !== "all" &&
          childCategories.length > 0 && (
            <Select
              value={filters.subcategory || "all"}
              onValueChange={(value) =>
                handleFilterChange("subcategory", value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {childCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label.split(" > ")[1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

        {/* Status Filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={filters.type || "all"}
          onValueChange={(value) => handleFilterChange("type", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Featured Filter - Only for Admin */}
        {isAdmin && (
          <Select
            value={filters.featured || "all"}
            onValueChange={(value) => handleFilterChange("featured", value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Featured" />
            </SelectTrigger>
            <SelectContent>
              {featuredOptions.map((featured) => (
                <SelectItem key={featured.value} value={featured.value}>
                  {featured.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort Filter */}
        <Select
          value={filters.sortBy || "newest"}
          onValueChange={(value) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
