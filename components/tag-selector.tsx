"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Plus } from "lucide-react";
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
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
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

  // Get selected tag objects
  const selectedTagObjects = useMemo(() => {
    return availableTags.filter((tag) => selectedTags.includes(tag.name));
  }, [availableTags, selectedTags]);

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
    },
    [selectedTags, onTagsChange, disabled]
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
              onClick={() => onTagsChange([])}
              disabled={disabled}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        {selectedTagObjects.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[44px]">
            {selectedTagObjects.map((tag) => (
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
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      </div>

      {/* Available Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Available Tags ({displayTags.length}/{filteredAvailableTags.length})
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

      {/* Hidden input for form submission */}
      <input type="hidden" name="tags" value={selectedTags.join(", ")} />
    </div>
  );
}
