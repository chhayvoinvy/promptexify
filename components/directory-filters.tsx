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
import { useState, useCallback, useTransition } from "react";
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
  const currentPremium = searchParams.get("premium") || "all";

  // Local state for form inputs
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [categoryFilter, setCategoryFilter] = useState(currentCategory);
  const [premiumFilter, setPremiumFilter] = useState(currentPremium);

  const updateURL = useCallback(
    (newParams: { q?: string; category?: string; premium?: string }) => {
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

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateURL({
        q: searchQuery,
        category: categoryFilter,
        premium: premiumFilter,
      });
    },
    [searchQuery, categoryFilter, premiumFilter, updateURL]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("all");
    setPremiumFilter("all");
    startTransition(() => {
      router.push("/directory");
    });
  }, [router]);

  const hasActiveFilters =
    currentQuery || currentCategory !== "all" || currentPremium !== "all";

  const parentCategories = categories.filter((cat) => !cat.parent);

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
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
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value)}
        >
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
      </form>
    </div>
  );
}
