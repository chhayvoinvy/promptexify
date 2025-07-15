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
import { Search, Filter, X } from "@/components/ui/icons";
import { Icons } from "@/components/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useCallback,
  useTransition,
  useMemo,
  useEffect,
} from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get current values from URL with safety checks and default values
  const currentQuery = searchParams?.get("q") ?? "";
  const currentCategory = searchParams?.get("category") ?? "all";
  const currentSubcategory = searchParams?.get("subcategory") ?? "all";
  const currentPremium = searchParams?.get("premium") ?? "all";

  // Local state for form inputs - always initialize with default values
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [premiumFilter, setPremiumFilter] = useState("all");

  // Sync local state with URL changes (when user navigates back/forward or initial load)
  useEffect(() => {
    setSearchQuery(currentQuery);
    setCategoryFilter(currentCategory);
    setSubcategoryFilter(currentSubcategory);
    setPremiumFilter(currentPremium);
  }, [currentQuery, currentCategory, currentSubcategory, currentPremium]);

  // Keyboard shortcut for opening filter dialog (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+F (Mac) or Ctrl+F (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault(); // Prevent default browser find behavior
        setIsDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      if (!searchParams || !router) return;
      
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
        // Close dialog after URL update
        setIsDialogOpen(false);
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

  // Note: Premium filter is hidden for now, but callback preserved for future use
  // const handlePremiumChange = useCallback(
  //   (value: string) => {
  //     setPremiumFilter(value);
  //     // Immediately update URL
  //     updateURL({
  //       q: searchQuery,
  //       category: categoryFilter,
  //       subcategory: subcategoryFilter,
  //       premium: value,
  //     });
  //   },
  //   [searchQuery, categoryFilter, subcategoryFilter, updateURL]
  // );

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
    if (router) {
      startTransition(() => {
        router.push("/directory");
        // Close dialog after clearing filters
        setIsDialogOpen(false);
      });
    }
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Filter button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icons.command className="h-3 w-3 scale-75" />
                  <span>+ F</span>
                </div>
                {isPending && (
                  <Badge variant="secondary" className="text-xs">
                    Updating...
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Filter Prompts</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 mt-2">
                {/* Search */}
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
                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full">
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
                {/* Subcategory Filter */}
                {categoryFilter !== "all" && childCategories.length > 0 && (
                  <Select
                    value={subcategoryFilter}
                    onValueChange={handleSubcategoryChange}
                  >
                    <SelectTrigger className="w-full">
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
                {/* Premium Filter (Hidden for now) */}
                {/* <Select value={premiumFilter} onValueChange={handlePremiumChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select> */}
                <DialogFooter className="flex flex-row gap-2 justify-between mt-4">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      clearFilters();
                    }}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="default">
                      Done
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
