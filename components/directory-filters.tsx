"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useCallback,
  useTransition,
  useMemo,
  useEffect,
} from "react";
import { Badge } from "@/components/ui/badge";

type CategoryWithCount = Awaited<
  ReturnType<typeof import("@/lib/content").getAllCategories>
>[0];

interface DirectoryFiltersProps {
  categories: CategoryWithCount[];
}

export function DirectoryFilters({ categories }: DirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current values from URL
  const currentQuery = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "all";
  const currentSubcategory = searchParams.get("subcategory") || "all";
  const currentPremium = searchParams.get("premium") || "all";

  // Local state for form inputs
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [categoryFilter, setCategoryFilter] = useState(currentCategory);
  const [subcategoryFilter, setSubcategoryFilter] =
    useState(currentSubcategory);
  const [premiumFilter, setPremiumFilter] = useState(currentPremium);

  // Sync local state with URL changes (when user navigates back/forward)
  useEffect(() => {
    setSearchQuery(currentQuery);
    setCategoryFilter(currentCategory);
    setSubcategoryFilter(currentSubcategory);
    setPremiumFilter(currentPremium);
  }, [currentQuery, currentCategory, currentSubcategory, currentPremium]);

  // Separate parent and child categories
  const parentCategories = useMemo(
    () => categories.filter((cat) => !cat.parent),
    [categories]
  );

  const childCategories = useMemo(() => {
    if (categoryFilter === "all") return [];
    return categories.filter((cat) => cat.parent?.slug === categoryFilter);
  }, [categories, categoryFilter]);

  const updateURL = useCallback(
    (newParams: {
      q?: string;
      category?: string;
      subcategory?: string;
      premium?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/directory?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategoryFilter(value);
      // Reset subcategory when parent category changes
      setSubcategoryFilter("all");
      // Immediately update URL with new category and reset subcategory
      updateURL({
        q: searchQuery,
        category: value,
        subcategory: "all",
        premium: premiumFilter,
      });
    },
    [searchQuery, premiumFilter, updateURL]
  );

  const handleSubcategoryChange = useCallback(
    (value: string) => {
      setSubcategoryFilter(value);
      // Immediately update URL
      updateURL({
        q: searchQuery,
        category: categoryFilter,
        subcategory: value,
        premium: premiumFilter,
      });
    },
    [searchQuery, categoryFilter, premiumFilter, updateURL]
  );

  const handlePremiumChange = useCallback(
    (value: string) => {
      setPremiumFilter(value);
      // Immediately update URL
      updateURL({
        q: searchQuery,
        category: categoryFilter,
        subcategory: subcategoryFilter,
        premium: value,
      });
    },
    [searchQuery, categoryFilter, subcategoryFilter, updateURL]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateURL({
        q: searchQuery,
        category: categoryFilter,
        subcategory: subcategoryFilter,
        premium: premiumFilter,
      });
    },
    [searchQuery, categoryFilter, subcategoryFilter, premiumFilter, updateURL]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setPremiumFilter("all");
    startTransition(() => {
      router.push("/directory");
    });
  }, [router]);

  const hasActiveFilters =
    currentQuery ||
    currentCategory !== "all" ||
    currentSubcategory !== "all" ||
    currentPremium !== "all";

  return (
    <div className="space-y-4">
      {/* Results info and active filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {isPending && (
            <Badge variant="secondary" className="text-xs">
              Updating...
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-col gap-4">
        {/* First row: Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isPending}>
            Search
          </Button>
        </form>

        {/* Second row: Category filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {parentCategories.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name} ({category._count.posts})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subcategory Filter - Only show when parent category is selected */}
          {categoryFilter !== "all" && childCategories.length > 0 && (
            <Select
              value={subcategoryFilter}
              onValueChange={handleSubcategoryChange}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Subcategories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {childCategories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name} ({category._count.posts})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Premium Filter */}
          <Select value={premiumFilter} onValueChange={handlePremiumChange}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {currentQuery && (
              <Badge variant="secondary" className="text-xs">
                Search: &ldquo;{currentQuery}&rdquo;
              </Badge>
            )}
            {currentCategory !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Category:{" "}
                {parentCategories.find((c) => c.slug === currentCategory)?.name}
              </Badge>
            )}
            {currentSubcategory !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Subcategory:{" "}
                {
                  childCategories.find((c) => c.slug === currentSubcategory)
                    ?.name
                }
              </Badge>
            )}
            {currentPremium !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Type: {currentPremium === "premium" ? "Premium" : "Free"}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
