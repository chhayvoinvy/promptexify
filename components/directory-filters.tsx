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
import { Search, X } from "@/components/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useCallback,
  useTransition,
  useEffect,
  useRef,
} from "react";

type SortOption = "relevance" | "latest" | "popular" | "trending";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Most Popular" },
  { value: "trending", label: "Trending" },
];

interface DirectoryFiltersProps {
  showSort?: boolean;
}

export function DirectoryFilters({ showSort = true }: DirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSort = (searchParams?.get("sort") as SortOption) ?? "latest";
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  useEffect(() => {
    setSortBy(currentSort);
  }, [currentSort]);

  // Focus the input when search bar opens
  useEffect(() => {
    if (isSearchOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isSearchOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const params = new URLSearchParams();
      params.set("q", trimmed);
      params.set("sort", "relevance");

      startTransition(() => {
        router.push(`/search?${params.toString()}`);
        setIsSearchOpen(false);
        setSearchQuery("");
      });
    },
    [searchQuery, router]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setSortBy(value as SortOption);

      if (!searchParams || !router) return;
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "latest") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }

      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/directory";
      const queryString = params.toString();

      startTransition(() => {
        router.push(queryString ? `${currentPath}?${queryString}` : currentPath);
      });
    },
    [router, searchParams]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    inputRef.current?.focus();
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      if (prev) setSearchQuery("");
      return !prev;
    });
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Expandable search */}
      <div className="flex items-center gap-2">
        {isSearchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts, tags, categories..."
                className="pl-9 pr-8 h-9 w-[240px] sm:w-[300px] text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" disabled={isPending || !searchQuery.trim()}>
              Search
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={toggleSearch}
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={toggleSearch}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sort dropdown */}
      {showSort && !isSearchOpen && (
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
