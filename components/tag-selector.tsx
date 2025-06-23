"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onPendingTagsChange?: (pendingTags: string[]) => void;
  pendingTags?: string[];
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
  onPendingTagsChange,
  pendingTags = [],
  maxTags = 15,
  disabled = false,
  className,
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filter available tags based on search query
  const filteredAvailableTags = useMemo(() => {
    if (!searchQuery) return availableTags;

    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableTags, searchQuery]);

  // Display tags (show only first 20 unless "show all" is clicked)
  const displayTags = useMemo(() => {
    return showAll ? filteredAvailableTags : filteredAvailableTags.slice(0, 20);
  }, [filteredAvailableTags, showAll]);

  // Get selected tag objects (existing tags only)
  const selectedExistingTagObjects = useMemo(() => {
    return availableTags.filter((tag) => selectedTags.includes(tag.name));
  }, [availableTags, selectedTags]);

  // Get pending tags that are selected but don't exist yet
  const selectedPendingTags = useMemo(() => {
    return selectedTags.filter(
      (tagName) => !availableTags.some((tag) => tag.name === tagName)
    );
  }, [selectedTags, availableTags]);

  // Check if search query matches existing tag
  const exactMatch = useMemo(() => {
    return availableTags.find(
      (tag) => tag.name.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [availableTags, searchQuery]);

  // Check if search query matches pending tag
  const pendingMatch = useMemo(() => {
    return pendingTags.find(
      (tagName) => tagName.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [pendingTags, searchQuery]);

  // Check if we can add a new pending tag
  const canAddPendingTag = useMemo(() => {
    const searchTrimmed = searchQuery.trim();
    return (
      searchTrimmed &&
      searchTrimmed.length > 0 &&
      !exactMatch &&
      !pendingMatch &&
      !selectedTags.some(
        (tag) => tag.toLowerCase() === searchTrimmed.toLowerCase()
      ) && // Prevent duplicate selection
      selectedTags.length < maxTags &&
      !disabled
    );
  }, [searchQuery, exactMatch, pendingMatch, selectedTags, maxTags, disabled]);

  // Handle key down events on search input
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();

        const searchTrimmed = searchQuery.trim();
        if (!searchTrimmed) return;

        if (exactMatch) {
          // If exact match exists, select it
          if (selectedTags.includes(exactMatch.name)) {
            // Remove tag
            onTagsChange(selectedTags.filter((tag) => tag !== exactMatch.name));
          } else {
            // Add tag (if under limit)
            if (selectedTags.length < maxTags) {
              onTagsChange([...selectedTags, exactMatch.name]);
            }
          }
        } else if (pendingMatch) {
          // If pending match exists, select it
          if (selectedTags.includes(pendingMatch)) {
            // Remove tag
            onTagsChange(selectedTags.filter((tag) => tag !== pendingMatch));
          } else {
            // Add tag (if under limit)
            if (selectedTags.length < maxTags) {
              onTagsChange([...selectedTags, pendingMatch]);
            }
          }
        } else if (canAddPendingTag) {
          // Add as pending tag, ensuring no duplicates
          const newTagName = searchTrimmed;

          // Double-check for duplicates (case-insensitive)
          const isDuplicate =
            selectedTags.some(
              (tag) => tag.toLowerCase() === newTagName.toLowerCase()
            ) ||
            pendingTags.some(
              (tag) => tag.toLowerCase() === newTagName.toLowerCase()
            );

          if (!isDuplicate && onPendingTagsChange) {
            onPendingTagsChange([...pendingTags, newTagName]);
            onTagsChange([...selectedTags, newTagName]);
            setSearchQuery("");
          }
        }
      }
    },
    [
      searchQuery,
      exactMatch,
      pendingMatch,
      canAddPendingTag,
      selectedTags,
      onTagsChange,
      onPendingTagsChange,
      pendingTags,
      maxTags,
    ]
  );

  // Handle tag selection/deselection
  const handleTagClick = useCallback(
    (tagName: string) => {
      if (disabled) return;

      if (selectedTags.includes(tagName)) {
        // Remove tag
        onTagsChange(selectedTags.filter((tag) => tag !== tagName));
      } else {
        // Add tag (if under limit)
        if (selectedTags.length < maxTags) {
          onTagsChange([...selectedTags, tagName]);
        }
      }
    },
    [selectedTags, onTagsChange, maxTags, disabled]
  );

  // Remove selected tag
  const handleRemoveTag = useCallback(
    (tagName: string) => {
      if (disabled) return;
      onTagsChange(selectedTags.filter((tag) => tag !== tagName));

      // Also remove from pending tags if it's a pending tag
      if (pendingTags.includes(tagName) && onPendingTagsChange) {
        onPendingTagsChange(pendingTags.filter((tag) => tag !== tagName));
      }
    },
    [selectedTags, onTagsChange, disabled, pendingTags, onPendingTagsChange]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Selected Tags ({selectedTags.length}/{maxTags})
          </Label>
          {selectedTags.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onTagsChange([]);
                if (onPendingTagsChange) {
                  onPendingTagsChange([]);
                }
              }}
              disabled={disabled}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[44px]">
            {/* Existing tags */}
            {selectedExistingTagObjects.map((tag) => (
              <Badge
                key={tag.id}
                variant="default"
                className="cursor-pointer flex items-center gap-1 hover:bg-primary/80"
                onClick={() => handleRemoveTag(tag.name)}
              >
                {tag.name}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {/* Pending tags */}
            {selectedPendingTags.map((tagName) => (
              <Badge
                key={`pending-${tagName}`}
                variant="secondary"
                className="cursor-pointer flex items-center gap-1 hover:bg-secondary/80 border-dashed border-2"
                onClick={() => handleRemoveTag(tagName)}
              >
                <Clock className="w-3 h-3" />
                {tagName}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center p-3 border rounded-lg bg-muted/30 min-h-[44px] text-sm text-muted-foreground">
            No tags selected. Click on available tags below to add them.
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="tag-search" className="text-sm font-medium">
          Search Available Tags
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="tag-search"
            type="text"
            placeholder="Search tags or press Enter to add new ones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            disabled={disabled}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              disabled={disabled}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Show add new tag hint */}
        {canAddPendingTag && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Press{" "}
              <kbd className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 rounded border">
                Enter
              </kbd>{" "}
              to add &ldquo;{searchQuery}&rdquo; as a new tag.
            </p>
          </div>
        )}
      </div>

      {/* Suggested Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Suggested Tags ({displayTags.length}/{filteredAvailableTags.length})
          </Label>
          {filteredAvailableTags.length > 20 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Show less" : "Show all"}
            </Button>
          )}
        </div>

        {displayTags.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background max-h-48 overflow-y-auto">
            {displayTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              const canAdd = !isSelected && selectedTags.length < maxTags;

              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200 flex items-center gap-1",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected &&
                      canAdd &&
                      "hover:bg-primary/10 hover:border-primary/50",
                    !isSelected && !canAdd && "opacity-50 cursor-not-allowed",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => handleTagClick(tag.name)}
                >
                  {!isSelected && canAdd && <Plus className="w-3 h-3" />}
                  {isSelected && <X className="w-3 h-3" />}
                  {tag.name}
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
            {searchQuery
              ? "No tags found matching your search."
              : "No tags available."}
          </div>
        )}
      </div>

      {/* Tag Limit Warning */}
      {selectedTags.length >= maxTags && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Tag limit reached:</strong> You can only select up to{" "}
            {maxTags} tags. Remove some tags to add new ones.
          </p>
        </div>
      )}

      {/* Pending Tags Info */}
      {selectedPendingTags.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Pending tags:</strong> {selectedPendingTags.length} tag
                {selectedPendingTags.length === 1 ? "" : "s"} will be created
                when you submit the form.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {selectedPendingTags.join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="tags" value={selectedTags.join(", ")} />
      <input type="hidden" name="pendingTags" value={pendingTags.join(", ")} />
    </div>
  );
}
