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
import { useState, useCallback, useTransition, useMemo } from "react";
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

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    // Reset subcategory when parent category changes
    setSubcategoryFilter("all");
  }, []);

  const handleSearch = useCallback(
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
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        {/* First row: Search and filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-48">
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
              onValueChange={(value) => setSubcategoryFilter(value)}
            >
              <SelectTrigger className="w-full md:w-48">
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
          <Select
            value={premiumFilter}
            onValueChange={(value) => setPremiumFilter(value)}
          >
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              className="flex items-center gap-2"
              disabled={isPending}
            >
              <Filter className="h-4 w-4" />
              {isPending ? "Filtering..." : "Filter"}
            </Button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
