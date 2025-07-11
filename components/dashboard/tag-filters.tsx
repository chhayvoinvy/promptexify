"use client";

import { useRouter } from "next/navigation";
import { Search, Filter, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TagFiltersProps {
  currentPageSize: number;
  currentPage: number;
  totalCount: number;
  filters: {
    search?: string;
    sortBy?: string;
  };
}

export function TagFilters({
  currentPageSize,
  currentPage,
  totalCount,
  filters,
}: TagFiltersProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [isPending, startTransition] = useTransition();
  const pageSizeOptions = [5, 10, 20, 50];

  const sortOptions = [
    { value: "name", label: "Name a-Z" },
    { value: "created", label: "Newest" },
    { value: "posts", label: "Most Posts" },
  ];

  const generateFilterUrl = (
    newFilters: Record<string, string | undefined>
  ) => {
    const url = new URL("/dashboard/tags", window.location.origin);

    // Preserve current filters and apply new ones
    const combinedFilters = { ...filters, ...newFilters };

    // Add non-default values to URL
    Object.entries(combinedFilters).forEach(([key, value]) => {
      if (value && value !== "name") {
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
    const url = new URL("/dashboard/tags", window.location.origin);

    // Preserve current filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "name") {
        url.searchParams.set(key, value);
      }
    });

    if (newPageSize !== 10) {
      url.searchParams.set("pageSize", newPageSize.toString());
    }

    return url.pathname + url.search;
  };

  const handleFilterChange = (filterType: string, value: string) => {
    startTransition(() => {
      const newUrl = generateFilterUrl({ [filterType]: value });
      router.push(newUrl);
    });
  };

  const handlePageSizeChange = (value: string) => {
    startTransition(() => {
      const newUrl = generatePageSizeUrl(parseInt(value));
      router.push(newUrl);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const newUrl = generateFilterUrl({
        search: searchValue.trim() || undefined,
      });
      router.push(newUrl);
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    startTransition(() => {
      router.push("/dashboard/tags");
    });
  };

  const hasActiveFilters =
    filters.search || (filters.sortBy && filters.sortBy !== "name");

  const startIndex = (currentPage - 1) * currentPageSize + 1;
  const endIndex = Math.min(currentPage * currentPageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tags by name or slug..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Search
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} disabled={isPending}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </form>

      {/* Results Info and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {totalCount > 0 ? startIndex : 0} to {endIndex} of{" "}
            {totalCount} tags
          </p>
          {hasActiveFilters && (
            <div className="flex gap-1">
              {filters.search && (
                <Badge variant="secondary" className="text-xs">
                  Search: {filters.search}
                </Badge>
              )}
              {filters.sortBy && filters.sortBy !== "name" && (
                <Badge variant="secondary" className="text-xs">
                  Sort:{" "}
                  {
                    sortOptions.find((opt) => opt.value === filters.sortBy)
                      ?.label
                  }
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Tags per page:</p>
          <Select
            value={currentPageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={isPending}
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
          <span className="text-sm font-medium">Sort by:</span>
        </div>

        {/* Sort Filter */}
        <Select
          value={filters.sortBy || "name"}
          onValueChange={(value) => handleFilterChange("sortBy", value)}
          disabled={isPending}
        >
          <SelectTrigger className="w-40">
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
      </div>
    </div>
  );
}
